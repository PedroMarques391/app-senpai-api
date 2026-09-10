import type { EmailQueue } from "@/queues";
import type { UserRepository } from "@/repositories";
import type { OtpService } from "@/services";
import type { ServiceResponse, SendOtpResult } from "@/types";

export class EmailService {
    constructor(
        private readonly otpService: OtpService,
        private readonly userRepository: UserRepository,
        private readonly emailQueue: EmailQueue
    ) { }

    async sendOTP(email: string): Promise<ServiceResponse<SendOtpResult>> {
        const user = await this.userRepository.find({ email });

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

        const otpResult = await this.otpService.generateOtp(email);

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
                identifier: user.email,
            },
        };
    }

    async verifyOtp(
        email: string,
        otpCode: string,
    ): Promise<{ success: boolean, message: string }> {
        const user = await this.userRepository.find({ email });
        if (!user) {
            throw new Error("User not found");
        }

        if (user.status === "inactive") {
            throw new Error("Credenciais inválidas");
        }

        const isValid = await this.otpService.verifyOtp(email, otpCode);

        if (!isValid) {
            throw new Error("Invalid or expired OTP");
        }


        const updated = await this.userRepository.update(
            { _id: user._id },
            { isEmailVerified: true },
        );

        if (!updated) {
            throw new Error("User not found");
        }

        return { success: true, message: "Email verified successfully" };
    }



}
