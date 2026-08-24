import { createUserDtoSchema, type CreateUserDto } from "@/dtos";
import type { User, UserRepository } from "@/models";
import type {
  AuthResult,
  OtpSecret,
  SendOtpResult,
  ServiceResponse,
} from "@/types";
import { AuthUtils, UserUtils } from "@/utils";
import type { JWT as FastifyJWT } from "@fastify/jwt";

export class AuthService {
  constructor(
    private readonly userRepository: Pick<
      UserRepository,
      "find" | "create" | "update"
    >,
    private readonly jwtInstance: FastifyJWT,
  ) { }

  async generateOTP(): Promise<OtpSecret> {
    const code = AuthUtils.generateOTP();
    const expires_at = AuthUtils.generateExpiresAt();

    return {
      code,
      expires_at,
      lastSend: new Date(),
    };
  }

  async sendOTP(waId: string): Promise<ServiceResponse<SendOtpResult>> {
    const url = `https://graph.facebook.com/v25.0/${process.env.WHATSAPP_PHONE_ID}/messages`;
    const currentDate = new Date();
    let otp: OtpSecret | undefined;

    const user = await this.userRepository.find({ wa_id: waId });

    if (user?.status === "inactive") {
      return {
        success: false,
        userExists: true,
        message:
          "Conta desativada. Entre em contato com o suporte para recuperar o acesso.",
      };
    }

    if (!user || !user.premium) {
      return {
        success: false,
        userExists: !!user,
        message: !!user
          ? "Certo, nós temos seu número de whatsapp. Agora você precisa finalizar a criação da sua conta."
          : "Você ainda não é um usuário da Senpai, por favor crie sua conta.",
      };
    }

    if (user.otp_secret && user.otp_secret.lastSend) {
      const timeSinceLastSend =
        currentDate.getTime() - user.otp_secret.lastSend.getTime();

      if (timeSinceLastSend < 60000) {
        const remainingSeconds = Math.ceil((60000 - timeSinceLastSend) / 1000);
        return {
          success: false,
          userExists: true,
          message: `Por favor, aguarde ${remainingSeconds} segundos antes de solicitar um novo código.`,
        };
      }

      if (user.otp_secret.expires_at > currentDate) {
        otp = {
          code: user.otp_secret.code,
          expires_at: user.otp_secret.expires_at,
          lastSend: currentDate,
        };
      }
    }

    if (!otp) {
      otp = await this.generateOTP();
    }
    const data = {
      messaging_product: "whatsapp",
      to: user.wa_id,
      type: "template",
      template: {
        name: "senpai_login_code",
        language: {
          code: "pt_BR",
        },
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: otp.code,
              },
            ],
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [
              {
                type: "text",
                text: otp.code,
              },
            ],
          },
        ],
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(
        `Failed to send OTP: ${responseData.error?.message || "Unknown error"}`,
      );
    }

    user.otp_secret = { ...otp };
    await this.userRepository.update({ wa_id: waId }, user);

    return {
      success: true,
      data: {
        otp: otp.code,
        wa_id: user.wa_id,
      },
    };
  }

  async verifyOtpAndLogin(waId: string, otpCode: string): Promise<AuthResult> {
    const user = await this.userRepository.find({ wa_id: waId });
    if (!user) {
      throw new Error("User not found");
    }

    if (user.status === "inactive") {
      throw new Error("Conta desativada. Entre em contato com o suporte para recuperar o acesso.");
    }

    if (
      !user.otp_secret ||
      user.otp_secret.code !== otpCode ||
      user.otp_secret.expires_at < new Date()
    ) {
      throw new Error("Invalid or expired OTP");
    }

    const updatedUser = UserUtils.applyDefaults({
      ...user,
      otp_secret: undefined,
      isNumberVerified: true,
      last_login: new Date(),
    });

    await this.userRepository.update({ wa_id: waId }, updatedUser);

    const token = AuthUtils.generateJWT(this.jwtInstance, {
      _id: updatedUser._id.toString(),
      wa_id: updatedUser.wa_id,
      name: updatedUser.name,
      userName: updatedUser.userName,
      premium: updatedUser.premium,
      email: updatedUser.email,
      isNumberVerified: updatedUser.isNumberVerified,
      role: updatedUser.role,
    });

    return { user: updatedUser, token };
  }

  async loginWithCredentials(
    identifier: string,
    passwordString: string,
  ): Promise<AuthResult> {
    let user = await this.userRepository.find({ email: identifier });
    if (!user) {
      user = await this.userRepository.find({ userName: identifier });
    }
    if (!user) {
      throw new Error("User not found");
    }

    if (user.status === "inactive") {
      throw new Error("Conta desativada. Entre em contato com o suporte para recuperar o acesso.");
    }

    if (!user.email || !user.password) {
      throw new Error(
        "This user does not have a email or password configured, please finish your account or go to signup",
      );
    }

    const isMatch = await AuthUtils.comparePassword(passwordString, user.password);
    if (!isMatch) {
      throw new Error("Invalid credentials");
    }

    user.last_login = new Date();
    await this.userRepository.update({ _id: user._id }, user);

    const token = AuthUtils.generateJWT(this.jwtInstance, {
      _id: user._id.toString(),
      wa_id: user.wa_id,
      name: user.name,
      userName: user.userName,
      premium: user.premium,
      email: user.email,
      isNumberVerified: user.isNumberVerified,
      role: user.role,
    });

    return { user, token };
  }

  async register(waId: string, userData: CreateUserDto): Promise<User | null> {
    const data = createUserDtoSchema.parse({
      ...userData,
      wa_id: waId,
    });

    const [waUser, emailUser, usernameUser] = await Promise.all([
      this.userRepository.find({ wa_id: data.wa_id }),
      this.userRepository.find({ email: data.email }),
      this.userRepository.find({ userName: data.userName }),
    ]);

    if (
      waUser?.status === "inactive" ||
      emailUser?.status === "inactive" ||
      usernameUser?.status === "inactive"
    ) {
      throw new Error(
        "Este número ou e-mail está associado a uma conta desativada. Entre em contato com o suporte.",
      );
    }

    if (
      UserUtils.isFullyRegistered(waUser) ||
      UserUtils.isDifferentUser(emailUser, waUser) ||
      UserUtils.isDifferentUser(usernameUser, waUser)
    ) {
      throw new Error(
        "Não foi possível concluir o cadastro. Verifique os dados informados ou tente fazer login.",
      );
    }

    const hashedPassword = await AuthUtils.hashPassword(data.password);
    const payload = { ...data, password: hashedPassword };

    if (waUser) {
      return this.userRepository.update({ _id: waUser._id }, payload);
    }

    return this.userRepository.create(payload);
  }
}
