import type { UserRepository } from "@/repositories";
import {
  renderResetPasswordEmailTemplate,
  renderSuccessEmailTemplate,
} from "@/templates";
import {
  AuthUtils,
  DateUtils,
  GeoUtils,
  NetworkUtils,
  UserUtils,
} from "@/utils";
import crypto from "crypto";
import type { CacheService } from "./cache.service";
import type { MailService } from "./mail.service";

export interface ResetPasswordClientInfo {
  ip?: string;
  userAgent?: string;
  headers?: Record<string, string | string[] | undefined>;
}

export class RecoveryService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly cacheService: CacheService,
    private readonly mailService: MailService,
  ) {}

  async forgotPassword(email: string) {
    const cleanEmail = UserUtils.normalizeIdentifier(email);

    const url = process.env.PRODUCTION_URL;

    const currentUser = await this.userRepository.find({ email: cleanEmail });

    if (
      !currentUser ||
      currentUser.status === "inactive" ||
      !currentUser.email
    ) {
      throw new Error("Erro ao tentar redefinir a senha. Tente novamente.");
    }

    const token = crypto.randomBytes(20).toString("hex");

    await this.cacheService.set(`reset:${token}`, cleanEmail, 60 * 10);

    const html = renderResetPasswordEmailTemplate({
      resetPasswordUrl: `${url}/pt/reset-password?token=${token}`,
      userName: currentUser.name || "User",
      expiresInMinutes: 10,
    });

    await this.mailService.sendMail({
      to: currentUser.email,
      subject: "Eii, parece que você esqueceu sua senha",
      html,
    });
  }

  async resetPassword(
    token: string,
    newPassword: string,
    clientInfo?: ResetPasswordClientInfo,
  ) {
    const userEmail = await this.cacheService.get<string>(`reset:${token}`);

    if (!userEmail) {
      throw new Error("Token inválido ou expirado.");
    }

    const cleanEmail = UserUtils.normalizeIdentifier(userEmail);
    const user = await this.userRepository.find({ email: cleanEmail });

    if (!user || user.status === "inactive") {
      throw new Error("Conta não encontrada ou inativa.");
    }

    const hashPassword = await AuthUtils.hashPassword(newPassword);

    await this.userRepository.update(
      { _id: user._id },
      { password: hashPassword },
    );

    await Promise.all([
      this.cacheService.del(`reset:${token}`),
      this.cacheService.del(`profile:${user._id}`),
      user.userName
        ? this.cacheService.del(`profile:username:${user.userName}`)
        : Promise.resolve(),
    ]);

    await this.sendSuccessResetPassword(cleanEmail, clientInfo);

    return {
      success: true,
      message: "Senha redefinida com sucesso.",
    };
  }

  private async sendSuccessResetPassword(
    email: string,
    clientInfo?: ResetPasswordClientInfo,
  ) {
    const cleanEmail = UserUtils.normalizeIdentifier(email);

    const user = await this.userRepository.find({ email: cleanEmail });

    if (!user || user.status === "inactive") {
      throw new Error("Conta não encontrada ou inativa.");
    }

    const ip = clientInfo?.ip || "Desconhecido";
    const dateTime = DateUtils.formatDateTime(new Date());
    const location = await GeoUtils.lookupLocation(ip, clientInfo?.headers);
    const device = NetworkUtils.parseDevice(clientInfo?.userAgent);

    const details = [
      {
        label: "Conta",
        value: cleanEmail,
      },
      {
        label: "Data e Horário",
        value: dateTime,
      },
      {
        label: "Endereço IP",
        value: ip,
      },
      {
        label: "Localização aproximada",
        value: location,
      },
      {
        label: "Dispositivo",
        value: device,
      },
    ];

    const html = renderSuccessEmailTemplate({
      title: "Senha alterada com sucesso",
      message:
        "Sua senha foi alterada com sucesso. Se foi você quem realizou essa alteração, nenhuma ação adicional é necessária.",
      details,
      noticeText:
        "Se você não reconhece esta alteração, entre em contato imediatamente com o suporte para proteger sua conta.",
    });

    await this.mailService.sendMail({
      to: cleanEmail,
      subject: "Segurança: sua senha foi alterada com sucesso",
      html,
    });
  }
}
