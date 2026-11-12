import type {
  CompleteRegistrationDto,
  PublicProfileDto,
  UpdateEquippedCosmeticsDto,
  UpdateUserDto,
} from "@/dtos";
import { AppError } from "@/errors";
import type { User } from "@/models";
import type { UserRepository } from "@/repositories";
import type { ICacheService, SendOtpResult, ServiceResponse } from "@/types";
import { AuthUtils, MongoUtils, PermissionUtils, UserUtils } from "@/utils";
import type { OtpService } from "./otp.service";

export class ProfileService {
  constructor(
    private readonly userRepository: UserRepository,
    private cacheService?: ICacheService,
    private readonly otpService?: OtpService,
  ) {}

  setCacheService(cacheService: ICacheService): void {
    this.cacheService = cacheService;
  }

  hasCacheService(): boolean {
    return Boolean(this.cacheService);
  }

  async invalidateProfile(userId: string, username?: string): Promise<void> {
    if (!this.cacheService) return;

    const deletions: Promise<void>[] = [
      this.cacheService.del(`profile:${userId}`),
    ];

    if (username) {
      deletions.push(
        this.cacheService.del(
          `profile:username:${UserUtils.normalizeIdentifier(username)}`,
        ),
      );
    }

    await Promise.all(deletions);
  }

  async getProfile(
    id: string,
    options?: { skipCache?: boolean },
  ): Promise<User | null> {
    const fetchProfile = async (): Promise<User> => {
      const userObjectId = MongoUtils.toObjectId(id, "ID de usuário inválido");
      const user = await this.userRepository.find({ _id: userObjectId });
      if (!user || user.status === "inactive") {
        throw new Error("Perfil de usuário não encontrado");
      }
      PermissionUtils.verifyOwnership(user._id, userObjectId, "Perfil Privado");

      const sanitized = UserUtils.applyDefaults(user);

      if (user.premium && !sanitized.premium) {
        await this.userRepository.update(
          { _id: userObjectId },
          {
            premium: false,
            subscription: {
              start: null,
              end: null,
              plan: null,
              type: "FREE",
            },
          },
        );
      }

      return sanitized;
    };

    if (!this.cacheService || options?.skipCache) {
      return fetchProfile();
    }

    return this.cacheService.getOrSet(
      `profile:${id}`,
      fetchProfile,
      60 * 60 * 24,
    );
  }

  async getProfileByUsername(
    username: string,
    options?: { skipCache?: boolean },
  ): Promise<PublicProfileDto | null> {
    const cleanUsername = UserUtils.normalizeIdentifier(username);

    const fetchPublicProfile = async (): Promise<PublicProfileDto> => {
      const user = await this.userRepository.find({ userName: cleanUsername });
      if (!user || user.status === "inactive") {
        throw new Error("Perfil de usuário não encontrado");
      }

      const sanitizedUser = UserUtils.applyDefaults(user);

      return {
        name: sanitizedUser.name,
        userName: sanitizedUser.userName,
        createdAt: sanitizedUser.createdAt,
        avatar_url: sanitizedUser.avatar_url,
        banner_url: sanitizedUser.banner_url,
        bio: sanitizedUser.bio,
        isVerifiedCreator: sanitizedUser.isVerifiedCreator,
        subscription: sanitizedUser.subscription,
        activity: sanitizedUser.activity,
        role: sanitizedUser.role,
        accountType: sanitizedUser.accountType,
        equipped_cosmetics: sanitizedUser.equipped_cosmetics,
      };
    };

    if (!this.cacheService || options?.skipCache) {
      return fetchPublicProfile();
    }

    return this.cacheService.getOrSet(
      `profile:username:${cleanUsername}`,
      fetchPublicProfile,
      60 * 60 * 24,
    );
  }

  private async ensureUsernameAvailable(
    userId: string,
    newUsername?: string,
    currentUsername?: string,
  ): Promise<void> {
    if (!newUsername || newUsername === currentUsername) return;
    const userExists = await this.userRepository.find({
      userName: newUsername,
    });
    if (userExists && userExists._id.toString() !== userId) {
      throw new Error("Este nome de usuário já está em uso");
    }
  }

  private async ensureEmailAvailable(
    userId: string,
    newEmail?: string,
    currentEmail?: string,
  ): Promise<void> {
    if (!newEmail || newEmail === currentEmail) return;
    const emailExists = await this.userRepository.find({ email: newEmail });
    if (emailExists && emailExists._id.toString() !== userId) {
      throw new Error("Este e-mail já está em uso");
    }
  }

  async completeRegistration(
    id: string,
    data: CompleteRegistrationDto,
  ): Promise<User | null> {
    const userObjectId = MongoUtils.toObjectId(id, "ID de usuário inválido");
    const user = await this.userRepository.find({ _id: userObjectId });

    if (!user || user.status === "inactive") {
      throw new Error("Perfil de usuário não encontrado");
    }

    const cleanUsername = UserUtils.normalizeIdentifier(data.userName);
    const cleanEmail = UserUtils.normalizeIdentifier(data.email);

    await Promise.all([
      this.ensureUsernameAvailable(id, cleanUsername, user.userName),
      this.ensureEmailAvailable(id, cleanEmail, user.email),
    ]);

    const hashedPassword = await AuthUtils.hashPassword(data.password);

    const updatedUser = await this.userRepository.update(
      { _id: userObjectId },
      {
        name: data.name,
        userName: cleanUsername,
        email: cleanEmail,
        password: hashedPassword,
      },
    );

    if (!updatedUser) {
      throw new Error("Falha ao finalizar o cadastro do usuário");
    }

    await this.invalidateProfile(id, cleanUsername);
    if (user.userName && user.userName !== cleanUsername) {
      await this.invalidateProfile(id, user.userName);
    }

    return updatedUser;
  }

  async deleteProfile(id: string): Promise<User | null> {
    const userObjectId = MongoUtils.toObjectId(id, "ID de usuário inválido");
    const user = await this.userRepository.find({ _id: userObjectId });
    if (!user) {
      throw new Error("Perfil de usuário não encontrado");
    }

    const result = await this.userRepository.update(
      { _id: userObjectId },
      { deletedAt: new Date(), status: "inactive" },
    );
    if (!result) {
      throw new Error("Falha ao deletar o perfil do usuário");
    }

    await this.invalidateProfile(id, user.userName);

    return result;
  }

  async updateProfile(
    id: string,
    updateData: UpdateUserDto,
  ): Promise<User | null> {
    const userObjectId = MongoUtils.toObjectId(id, "ID de usuário inválido");
    const currentUser = await this.userRepository.find({ _id: userObjectId });

    if (!currentUser) {
      throw new Error("Perfil de usuário não encontrado");
    }

    if (updateData.userName) {
      updateData.userName = UserUtils.normalizeIdentifier(updateData.userName);
      await this.ensureUsernameAvailable(
        id,
        updateData.userName,
        currentUser.userName,
      );
    }

    const payloadToUpdate: Partial<User> = { ...updateData };

    const updatedUser = await this.userRepository.update(
      { _id: userObjectId },
      payloadToUpdate,
    );

    if (!updatedUser) {
      throw new Error("Falha ao atualizar o perfil do usuário");
    }

    await this.invalidateProfile(id, currentUser.userName);
    if (updateData.userName && updateData.userName !== currentUser.userName) {
      await this.invalidateProfile(id, updateData.userName);
    }

    return UserUtils.applyDefaults(updatedUser);
  }

  async updateEquippedCosmetics(
    id: string,
    data: UpdateEquippedCosmeticsDto,
  ): Promise<User | null> {
    const userObjectId = MongoUtils.toObjectId(id, "ID de usuário inválido");
    const currentUser = await this.userRepository.find({ _id: userObjectId });

    if (!currentUser) {
      throw new Error("Perfil de usuário não encontrado");
    }

    const currentCosmetics = currentUser.equipped_cosmetics ?? {
      card_style: "card_style_default",
      effect: "effect_none",
      background: "background_default",
    };

    const updatedCosmetics = {
      card_style:
        data.card_style ?? currentCosmetics.card_style ?? "card_style_default",
      effect: data.effect ?? currentCosmetics.effect ?? "effect_none",
      background:
        data.background ?? currentCosmetics.background ?? "background_default",
    };

    const updatedUser = await this.userRepository.update(
      { _id: userObjectId },
      { equipped_cosmetics: updatedCosmetics },
    );

    if (!updatedUser) {
      throw new Error("Falha ao atualizar os cosméticos do usuário");
    }

    await this.invalidateProfile(id, currentUser.userName);

    return UserUtils.applyDefaults(updatedUser);
  }

  async sendEmailVerification(
    userId: string,
    userEmail: string,
  ): Promise<ServiceResponse<SendOtpResult>> {
    if (!this.otpService) {
      throw new AppError("Serviço de OTP indisponível", 500);
    }

    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID de usuário inválido",
    );
    const user = await this.userRepository.find({ _id: userObjectId });

    if (!user || user.status === "inactive") {
      throw new AppError(
        "Usuário não encontrado ou conta inativa.",
        404,
        "USER_NOT_FOUND",
      );
    }

    if (!userEmail) {
      throw new AppError("E-mail não informado.", 400, "INVALID_EMAIL");
    }

    const cleanEmail = UserUtils.normalizeIdentifier(userEmail);

    return this.otpService.sendEmailOtp(cleanEmail, user.name);
  }

  async verifyEmail(
    userId: string,
    email: string,
    code: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!this.otpService) {
      throw new AppError("Serviço de OTP indisponível", 500);
    }

    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID de usuário inválido",
    );
    const user = await this.userRepository.find({ _id: userObjectId });

    if (!user || user.status === "inactive") {
      throw new AppError(
        "Usuário não encontrado ou conta inativa.",
        404,
        "USER_NOT_FOUND",
      );
    }

    const cleanEmail = UserUtils.normalizeIdentifier(email);

    await this.otpService.verifyEmailOtp(cleanEmail, code, { success: true });

    const updated = await this.userRepository.update(
      { _id: userObjectId },
      { email: cleanEmail, isEmailVerified: true },
    );

    if (!updated) {
      throw new AppError(
        "Não foi possível confirmar o e-mail. Tente novamente.",
        500,
        "UPDATE_FAILED",
      );
    }

    await this.invalidateProfile(userId, user.userName);

    return { success: true, message: "E-mail verificado com sucesso!" };
  }

  async sendPhoneVerification(
    userId: string,
    phoneInput?: string,
  ): Promise<ServiceResponse<SendOtpResult>> {
    if (!this.otpService) {
      throw new AppError("Serviço de OTP indisponível", 500);
    }

    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID de usuário inválido",
    );
    const user = await this.userRepository.find({ _id: userObjectId });

    if (!user || user.status === "inactive") {
      throw new AppError(
        "Usuário não encontrado ou conta inativa.",
        404,
        "USER_NOT_FOUND",
      );
    }

    const phone = phoneInput || user.wa_id;
    if (!phone) {
      return {
        success: false,
        userExists: true,
        message: "Número de WhatsApp não informado.",
      };
    }

    const variants = AuthUtils.getWaIdVariants(phone);
    const targetWaId = variants[0];

    if (!targetWaId || targetWaId.length < 8) {
      return {
        success: false,
        userExists: true,
        message: "Número de WhatsApp inválido.",
      };
    }

    const existingUser = await this.userRepository.find({
      wa_id: { $in: variants },
    });

    if (
      existingUser &&
      existingUser.isNumberVerified &&
      existingUser._id.toString() !== userId
    ) {
      return {
        success: false,
        userExists: true,
        message:
          "Este número de WhatsApp já foi validado em outra conta da Senpai.",
      };
    }

    return this.otpService.sendWhatsappOtp(targetWaId);
  }

  async verifyPhone(
    userId: string,
    phone: string,
    code: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!this.otpService) {
      throw new AppError("Serviço de OTP indisponível", 500);
    }

    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID de usuário inválido",
    );
    const user = await this.userRepository.find({ _id: userObjectId });

    if (!user || user.status === "inactive") {
      throw new AppError(
        "Usuário não encontrado ou conta inativa.",
        404,
        "USER_NOT_FOUND",
      );
    }

    const variants = AuthUtils.getWaIdVariants(phone);
    const targetWaId = variants[0];

    if (!targetWaId || targetWaId.length < 8) {
      throw new AppError("Número de WhatsApp inválido.", 400, "INVALID_PHONE");
    }

    const existingUser = await this.userRepository.find({
      wa_id: { $in: variants },
    });

    if (
      existingUser &&
      existingUser.isNumberVerified &&
      existingUser._id.toString() !== userId
    ) {
      throw new AppError(
        "Este número de WhatsApp já está vinculado a outra conta da Senpai.",
        409,
        "PHONE_ALREADY_VERIFIED",
      );
    }

    await this.otpService.verifyWhatsappOtp(targetWaId, code);

    const updated = await this.userRepository.update(
      { _id: userObjectId },
      { wa_id: targetWaId, isNumberVerified: true },
    );

    if (!updated) {
      throw new AppError(
        "Não foi possível confirmar o número de WhatsApp. Tente novamente.",
        500,
        "UPDATE_FAILED",
      );
    }

    await this.invalidateProfile(userId, user.userName);

    return {
      success: true,
      message: "Número de WhatsApp verificado com sucesso!",
    };
  }
}
