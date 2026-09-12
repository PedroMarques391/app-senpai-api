import type {
  CompleteRegistrationDto,
  PublicProfileDto,
  UpdateUserDto,
} from "@/dtos";
import type { User } from "@/models";
import type { UserRepository } from "@/repositories";
import { AuthUtils, MongoUtils, PermissionUtils, UserUtils } from "@/utils";

export class ProfileService {
  constructor(private readonly userRepository: UserRepository) {}

  async getProfile(id: string): Promise<User | null> {
    const userObjectId = MongoUtils.toObjectId(id, "ID de usuário inválido");
    const user = await this.userRepository.find({ _id: userObjectId });
    if (!user || user.status === "inactive") {
      throw new Error("Perfil de usuário não encontrado");
    }
    PermissionUtils.verifyOwnership(user._id, userObjectId, "Perfil Privado");
    return user;
  }

  async getProfileByUsername(
    username: string,
  ): Promise<PublicProfileDto | null> {
    const cleanUsername = UserUtils.normalizeIdentifier(username);
    const user = await this.userRepository.find({ userName: cleanUsername });
    if (!user || user.status === "inactive") {
      throw new Error("Perfil de usuário não encontrado");
    }

    return {
      name: user.name,
      userName: user.userName,
      createdAt: user.createdAt,
      avatar_url: user.avatar_url,
      banner_url: user.banner_url,
      isVerifiedCreator: user.isVerifiedCreator,
    };
  }

  private async ensureUsernameAvailable(
    userId: string,
    newUsername?: string,
    currentUsername?: string,
  ): Promise<void> {
    if (!newUsername || newUsername === currentUsername) return;
    const userExists = await this.userRepository.find({ userName: newUsername });
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
    }
    if (updateData.email) {
      updateData.email = UserUtils.normalizeIdentifier(updateData.email);
    }

    await Promise.all([
      this.ensureUsernameAvailable(id, updateData.userName, currentUser.userName),
      this.ensureEmailAvailable(id, updateData.email, currentUser.email),
    ]);

    const updatedUser = await this.userRepository.update(
      { _id: userObjectId },
      updateData,
    );

    if (!updatedUser) {
      throw new Error("Falha ao atualizar o perfil do usuário");
    }

    return updatedUser;
  }
}
