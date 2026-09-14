import type { UserRepository } from "@/repositories";
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
import { OtpUtils, UserUtils } from "@/utils";
import type { CacheService } from "./cache.service";
import type { MailService } from "./mail.service";

export class OtpService {
  private readonly DEFAULT_COOLDOWN_SECONDS = 60;
  private readonly DEFAULT_TTL_SECONDS = 300;
  private readonly DEFAULT_PREFIX = "otp";

  constructor(
    private readonly cacheService: CacheService,
    private readonly mailService: MailService,
    private readonly userRepository: UserRepository,
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

  async generateAndSendEmailOtp(
    email: string,
  ): Promise<ServiceResponse<SendOtpResult>> {
    const cleanEmail = UserUtils.normalizeIdentifier(email);
    const user = await this.userRepository.find({ email: cleanEmail });

    if (user?.status === "inactive") {
      return {
        success: false,
        userExists: true,
        message:
          "Não foi possível concluir o cadastro. Verifique os dados informados ou tente fazer login.",
      };
    }

    if (!user) {
      return {
        success: false,
        userExists: false,
        message:
          "Você ainda não é um usuário da Senpai, por favor crie sua conta.",
      };
    }

    const otpResult = await this.generateOtp(cleanEmail);

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
      userName: user.name || "User",
    });

    await this.mailService.sendMail({
      to: user.email,
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
    email: string,
    code: string,
  ): Promise<{ success: boolean; message: string }> {
    const cleanEmail = UserUtils.normalizeIdentifier(email);
    const user = await this.userRepository.find({ email: cleanEmail });

    if (!user) {
      throw new Error("Usuário não encontrado com este e-mail.");
    }

    if (user.status === "inactive") {
      throw new Error("Credenciais inválidas");
    }

    const isValid = await this.verifyOtp(cleanEmail, code);

    if (!isValid) {
      throw new Error(
        "Código de verificação inválido ou expirado. Solicite um novo código.",
      );
    }

    const updated = await this.userRepository.update(
      { _id: user._id },
      { isEmailVerified: true },
    );

    if (!updated) {
      throw new Error("Não foi possível confirmar o e-mail. Tente novamente.");
    }

    const html = renderSuccessEmailTemplate({
      title: "E-mail verificado com sucesso!",
      message:
        "Seu e-mail foi verificado com sucesso. Agora você tem acesso completo a todas as funcionalidades da sua conta Senpai!",
      noticeText:
        "Se você não realizou essa confirmação, entre em contato imediatamente com a nossa equipe de suporte.",
    });

    await this.mailService.sendMail({
      to: cleanEmail,
      subject: "E-mail verificado com sucesso - Senpai",
      html,
    });

    return { success: true, message: "E-mail verificado com sucesso!" };
  }
}
