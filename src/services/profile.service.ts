import type { PublicProfileDto, UpdateUserDto } from "@/dtos";
import type { User } from "@/models";
import type { UserRepository } from "@/repositories";
import { MongoUtils, PermissionUtils } from "@/utils";

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
    const user = await this.userRepository.find({ userName: username });
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
    const existingUser = await this.userRepository.find({ _id: userObjectId });
    if (!existingUser) {
      throw new Error("Perfil de usuário não encontrado");
    }

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
