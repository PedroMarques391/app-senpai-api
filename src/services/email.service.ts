import type { EmailQueue } from "@/queues";
import type { UserRepository } from "@/repositories";
import type { OtpService } from "@/services";
import type { ServiceResponse, SendOtpResult } from "@/types";
import { UserUtils } from "@/utils";

export class EmailService {
    constructor(
        private readonly otpService: OtpService,
        private readonly userRepository: UserRepository,
        private readonly emailQueue: EmailQueue
    ) { }

    async sendOTP(email: string): Promise<ServiceResponse<SendOtpResult>> {
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

        if (!user || !user.premium) {
            return {
                success: false,
                userExists: !!user,
                message: !!user
                    ? "Parece que você ainda não é um usuário premium, cria sua conta ou faça login para continuar."
                    : "Você ainda não é um usuário da Senpai, por favor crie sua conta.",
            };
        }

        const otpResult = await this.otpService.generateOtp(cleanEmail);

        if (otpResult.success === false) {
            return {
                success: false,
                userExists: true,
                retryAfter: otpResult.retryAfter,
                message: otpResult.message,
            };
        }

        await this.emailQueue.addJob(
            "send-email",
            {
                to: user.email,
                subject: "Eii, seu código está aqui!",
                userName: user.name || "User",
                body: otpResult.code,
            },
            {
                attempts: 2,
            },
        );

        return {
            success: true,
            data: {
                otp: otpResult.code,
                identifier: cleanEmail,
            },
        };
    }

    async verifyOtp(
        email: string,
        otpCode: string,
    ): Promise<{ success: boolean, message: string }> {
        const cleanEmail = UserUtils.normalizeIdentifier(email);
        const user = await this.userRepository.find({ email: cleanEmail });
        if (!user) {
            throw new Error("Usuário não encontrado com este e-mail.");
        }

        if (user.status === "inactive") {
            throw new Error("Credenciais inválidas");
        }

        const isValid = await this.otpService.verifyOtp(cleanEmail, otpCode);

        if (!isValid) {
            throw new Error("Código de verificação inválido ou expirado. Solicite um novo código.");
        }


        const updated = await this.userRepository.update(
            { _id: user._id },
            { isEmailVerified: true },
        );

        if (!updated) {
            throw new Error("Não foi possível confirmar o e-mail. Tente novamente.");
        }

        return { success: true, message: "E-mail verificado com sucesso!" };
    }



}
