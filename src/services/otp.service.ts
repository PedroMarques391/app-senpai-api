import { EMAIL_REPLY_TO, EMAIL_SENDERS } from "@/constants";
import { AppError } from "@/errors";
import type { WhatsAppQueue } from "@/queues";
import {
  renderOtpEmailTemplate,
  renderSuccessEmailTemplate,
} from "@/templates";
import type {
  GenerateOtpOptions,
  GenerateOtpResult,
  OtpSecret,
  SendOtpResult,
  ServiceResponse,
  VerifyOtpOptions,
} from "@/types";
import { AuthUtils, OtpUtils, UserUtils } from "@/utils";
import type { CacheService } from "./cache.service";
import type { MailService } from "./mail.service";

export class OtpService {
  private readonly DEFAULT_COOLDOWN_SECONDS = 60;
  private readonly DEFAULT_TTL_SECONDS = 300;
  private readonly DEFAULT_PREFIX = "otp";

  constructor(
    private readonly cacheService: CacheService,
    private readonly mailService: MailService,
    private readonly whatsappQueue: WhatsAppQueue,
  ) {}

  private getCacheKey(identifier: string, prefix: string): string {
    return `${prefix}:${identifier}`;
  }

  async generateOtp(
    identifier: string,
    options?: GenerateOtpOptions,
  ): Promise<GenerateOtpResult> {
    const prefix = options?.prefix ?? this.DEFAULT_PREFIX;
    const cooldownSeconds =
      options?.cooldownSeconds ?? this.DEFAULT_COOLDOWN_SECONDS;
    const ttlSeconds = options?.ttlSeconds ?? this.DEFAULT_TTL_SECONDS;

    const cacheKey = this.getCacheKey(identifier, prefix);
    const cachedOtp = await this.cacheService.get<OtpSecret>(cacheKey);

    if (cachedOtp) {
      const remainingSeconds = OtpUtils.getRemainingCooldown(
        cachedOtp.createdAt,
        cooldownSeconds,
      );

      if (remainingSeconds > 0) {
        return {
          success: false,
          retryAfter: remainingSeconds,
          message: `Por favor, aguarde ${remainingSeconds} segundos antes de solicitar um novo código.`,
        };
      }
    }

    const code = cachedOtp?.code ?? OtpUtils.generate();

    await this.cacheService.set(
      cacheKey,
      { code, createdAt: Date.now() },
      ttlSeconds,
    );

    return {
      success: true,
      code,
    };
  }

  async verifyOtp(
    identifier: string,
    code: string,
    options?: VerifyOtpOptions,
  ): Promise<boolean> {
    if (!code) {
      return false;
    }

    const prefix = options?.prefix ?? this.DEFAULT_PREFIX;
    const cacheKey = this.getCacheKey(identifier, prefix);
    const cachedOtp = await this.cacheService.get<OtpSecret>(cacheKey);

    if (!cachedOtp || cachedOtp.code !== code) {
      return false;
    }

    await this.cacheService.del(cacheKey);
    return true;
  }

  async clearOtp(
    identifier: string,
    options?: VerifyOtpOptions,
  ): Promise<void> {
    const prefix = options?.prefix ?? this.DEFAULT_PREFIX;
    const cacheKey = this.getCacheKey(identifier, prefix);
    await this.cacheService.del(cacheKey);
  }

  async sendWhatsappOtp(
    rawWaId: string,
    options?: GenerateOtpOptions,
  ): Promise<ServiceResponse<SendOtpResult>> {
    const variants = AuthUtils.getWaIdVariants(rawWaId);
    const targetWaId = variants[0];

    if (!targetWaId || targetWaId.length < 8) {
      return {
        success: false,
        userExists: true,
        message: "Número de WhatsApp inválido.",
      };
    }

    const otpResult = await this.generateOtp(targetWaId, {
      prefix: options?.prefix ?? "wa_otp",
      cooldownSeconds: options?.cooldownSeconds,
      ttlSeconds: options?.ttlSeconds,
    });

    if (otpResult.success === false) {
      return {
        success: false,
        userExists: true,
        retryAfter: otpResult.retryAfter,
        message: otpResult.message,
      };
    }

    await this.whatsappQueue.addJob(
      "send-message",
      {
        number: targetWaId,
        message: otpResult.code,
      },
      {
        attempts: 2,
      },
    );

    return {
      success: true,
      data: {
        otp: otpResult.code,
        identifier: targetWaId,
      },
    };
  }

  async verifyWhatsappOtp(
    rawWaId: string,
    code: string,
    options?: VerifyOtpOptions,
  ): Promise<boolean> {
    const variants = AuthUtils.getWaIdVariants(rawWaId);
    const targetWaId = variants[0];

    if (!targetWaId || !code) {
      throw new AppError(
        "Código de verificação inválido ou expirado. Solicite um novo código.",
        400,
        "INVALID_OTP",
      );
    }

    let isValid = false;
    for (const variant of variants) {
      isValid = await this.verifyOtp(variant, code, {
        prefix: options?.prefix ?? "wa_otp",
      });
      if (isValid) break;
    }

    if (!isValid) {
      throw new AppError(
        "Código de verificação inválido ou expirado. Solicite um novo código.",
        400,
        "INVALID_OTP",
      );
    }

    return true;
  }

  async sendEmailOtp(
    rawEmail: string,
    userName?: string,
    options?: GenerateOtpOptions,
  ): Promise<ServiceResponse<SendOtpResult>> {
    const cleanEmail = UserUtils.normalizeIdentifier(rawEmail);

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return {
        success: false,
        userExists: true,
        message: "E-mail inválido.",
      };
    }

    const otpResult = await this.generateOtp(cleanEmail, {
      prefix: options?.prefix ?? this.DEFAULT_PREFIX,
      cooldownSeconds: options?.cooldownSeconds,
      ttlSeconds: options?.ttlSeconds,
    });

    if (otpResult.success === false) {
      return {
        success: false,
        userExists: true,
        retryAfter: otpResult.retryAfter,
        message: otpResult.message,
      };
    }

    const html = renderOtpEmailTemplate({
      otp: otpResult.code,
      userName: userName || "User",
    });

    await this.mailService.sendMail({
      from: EMAIL_SENDERS.NOREPLY,
      to: cleanEmail,
      subject: "Eii, seu código está aqui!",
      html,
    });

    return {
      success: true,
      data: {
        otp: otpResult.code,
        identifier: cleanEmail,
      },
    };
  }

  async verifyEmailOtp(
    rawEmail: string,
    code: string,
    options?: VerifyOtpOptions,
  ): Promise<boolean> {
    const cleanEmail = UserUtils.normalizeIdentifier(rawEmail);

    if (!cleanEmail || !code) {
      throw new AppError(
        "Código de verificação inválido ou expirado. Solicite um novo código.",
        400,
        "INVALID_OTP",
      );
    }

    const isValid = await this.verifyOtp(cleanEmail, code, {
      prefix: options?.prefix ?? this.DEFAULT_PREFIX,
      success: options?.success,
    });

    if (!isValid) {
      throw new AppError(
        "Código de verificação inválido ou expirado. Solicite um novo código.",
        400,
        "INVALID_OTP",
      );
    }

    if (options?.success !== false) {
      await this.sendEmailVerificationSuccess(cleanEmail);
    }

    return true;
  }

  async sendEmailVerificationSuccess(rawEmail: string): Promise<void> {
    const cleanEmail = UserUtils.normalizeIdentifier(rawEmail);
    const html = renderSuccessEmailTemplate({
      title: "E-mail verificado com sucesso!",
      message:
        "Seu e-mail foi verificado com sucesso. Agora você tem acesso completo a todas as funcionalidades da sua conta Senpai!",
      noticeText:
        "Se você não realizou essa confirmação, entre em contato imediatamente com a nossa equipe de suporte.",
    });

    await this.mailService.sendMail({
      from: EMAIL_SENDERS.SUPPORT,
      replyTo: EMAIL_REPLY_TO,
      to: cleanEmail,
      subject: "E-mail verificado com sucesso - Senpai",
      html,
    });
  }
}
