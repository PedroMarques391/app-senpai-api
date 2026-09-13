import type { UserRepository } from "@/repositories";
import { renderResetPasswordEmailTemplate } from "@/templates";
import { AuthUtils, UserUtils } from "@/utils";
import crypto from "crypto";
import type { CacheService } from "./cache.service";
import type { MailService } from "./mail.service";

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

  async resetPassword(token: string, newPassword: string) {
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

    return {
      success: true,
      message: "Senha redefinida com sucesso.",
    };
  }
}

