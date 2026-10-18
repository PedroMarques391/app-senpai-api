import { createUserDtoSchema, type CreateUserDto } from "@/dtos";
import { AppError } from "@/errors";
import type { User, UserRepository } from "@/models";
import type { WhatsAppQueue } from "@/queues";
import type { AuthResult, SendOtpResult, ServiceResponse } from "@/types";
import { AuthUtils, UserUtils } from "@/utils";
import type { JWT as FastifyJWT } from "@fastify/jwt";
import type { OtpService } from "./otp.service";

export class AuthService {
  constructor(
    private readonly userRepository: Pick<
      UserRepository,
      "find" | "create" | "update"
    >,
    private readonly jwtInstance: FastifyJWT,
    private readonly whatsappQueue: WhatsAppQueue,
    private readonly otpService: OtpService,
  ) {}

  async sendOTP(rawWaId: string): Promise<ServiceResponse<SendOtpResult>> {
    const variants = AuthUtils.getWaIdVariants(rawWaId);
    const user = await this.userRepository.find({ wa_id: { $in: variants } });

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

    const otpResult = await this.otpService.generateOtp(user.wa_id);

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
        number: user.wa_id,
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
        identifier: user.wa_id,
      },
    };
  }

  async verifyOtpAndLogin(
    rawWaId: string,
    otpCode: string,
  ): Promise<AuthResult> {
    const variants = AuthUtils.getWaIdVariants(rawWaId);
    const user = await this.userRepository.find({ wa_id: { $in: variants } });
    if (!user) {
      throw new AppError(
        "Conta não encontrada. Verifique seu número de WhatsApp.",
        404,
        "USER_NOT_FOUND",
      );
    }

    if (user.status === "inactive") {
      throw new AppError("Credenciais inválidas", 401, "INVALID_CREDENTIALS");
    }

    const isValid = await this.otpService.verifyOtp(user.wa_id, otpCode);

    if (!isValid) {
      throw new AppError(
        "Código de verificação inválido ou expirado. Solicite um novo código.",
        400,
        "INVALID_OTP",
      );
    }

    const fullUser = UserUtils.applyDefaults({
      ...user,
      isNumberVerified: true,
      last_login: new Date(),
    });
    await this.userRepository.update({ _id: user._id }, fullUser);

    const payload = {
      _id: fullUser._id.toString(),
      wa_id: fullUser.wa_id,
      name: fullUser.name,
      userName: fullUser.userName,
      email: fullUser.email,
      isNumberVerified: fullUser.isNumberVerified,
      isEmailVerified: fullUser.isEmailVerified,
      role: fullUser.role,
      accountType: fullUser.accountType,
    };

    const token = AuthUtils.generateJWT(this.jwtInstance, payload);

    return { user: fullUser, token };
  }

  async loginWithCredentials(
    identifier: string,
    passwordString: string,
  ): Promise<AuthResult> {
    const cleanIdentifier = UserUtils.normalizeIdentifier(identifier);
    let user = await this.userRepository.find({ email: cleanIdentifier });
    if (!user) {
      user = await this.userRepository.find({ userName: cleanIdentifier });
    }
    if (!user) {
      throw new AppError(
        "E-mail, usuário ou senha incorretos. Verifique os dados e tente novamente.",
        401,
        "INVALID_CREDENTIALS",
      );
    }

    if (user.status === "inactive") {
      throw new AppError("Credenciais inválidas", 401, "INVALID_CREDENTIALS");
    }

    if (!user.email || !user.password) {
      throw new AppError(
        "Sua conta ainda não possui senha cadastrada. Conclua seu cadastro ou entre pelo WhatsApp.",
        400,
        "PASSWORD_NOT_SET",
      );
    }

    const isMatch = await AuthUtils.comparePassword(
      passwordString,
      user.password,
    );
    if (!isMatch) {
      throw new AppError(
        "E-mail, usuário ou senha incorretos. Verifique os dados e tente novamente.",
        401,
        "INVALID_CREDENTIALS",
      );
    }

    const fullUser = UserUtils.applyDefaults({
      ...user,
      last_login: new Date(),
    });

    await this.userRepository.update({ _id: fullUser._id }, fullUser);

    const payload = {
      _id: fullUser._id.toString(),
      wa_id: fullUser.wa_id,
      name: fullUser.name,
      userName: fullUser.userName,
      email: fullUser.email,
      isNumberVerified: fullUser.isNumberVerified,
      isEmailVerified: fullUser.isEmailVerified,
      role: fullUser.role,
      accountType: fullUser.accountType,
    };
    const token = AuthUtils.generateJWT(this.jwtInstance, payload);

    return { user: fullUser, token };
  }

  async register(
    rawWaId: string,
    userData: CreateUserDto,
  ): Promise<User | null> {
    const variants = AuthUtils.getWaIdVariants(rawWaId || userData.wa_id);

    const data = createUserDtoSchema.parse({
      ...userData,
      wa_id: variants[0],
    });

    const [waUser, emailUser, usernameUser] = await Promise.all([
      this.userRepository.find({ wa_id: { $in: variants } }),
      this.userRepository.find({ email: data.email }),
      this.userRepository.find({ userName: data.userName }),
    ]);

    if (UserUtils.isFullyRegistered(waUser)) {
      throw new AppError(
        "Este número de WhatsApp já possui uma conta cadastrada. Tente fazer login.",
        409,
        "WA_ID_IN_USE",
      );
    }

    const isEmailInUse = UserUtils.isDifferentUser(emailUser, waUser);
    const isUsernameInUse = UserUtils.isDifferentUser(usernameUser, waUser);

    if (isEmailInUse && isUsernameInUse) {
      throw new AppError(
        "O e-mail e o nome de usuário já estão em uso.",
        409,
        "EMAIL_AND_USERNAME_IN_USE",
      );
    }

    if (isEmailInUse) {
      throw new AppError("Este e-mail já está em uso.", 409, "EMAIL_IN_USE");
    }

    if (isUsernameInUse) {
      throw new AppError(
        "Este nome de usuário já está em uso.",
        409,
        "USERNAME_IN_USE",
      );
    }

    if (
      waUser?.status === "inactive" ||
      emailUser?.status === "inactive" ||
      usernameUser?.status === "inactive"
    ) {
      throw new AppError(
        "Esta conta está desativada. Entre em contato com o suporte.",
        403,
        "ACCOUNT_INACTIVE",
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
