import type { UpdateUserDto } from "@/dtos";
import type { User } from "@/models";
import type { UserRepository } from "@/repositories";
import { MongoUtils } from "@/utils";

export class ProfileService {
  constructor(private readonly userRepository: UserRepository) {}

  async getProfile(id: string): Promise<User | null> {
    const userObjectId = MongoUtils.toObjectId(id, "ID de usuário inválido");
    const user = await this.userRepository.find({ _id: userObjectId });
    if (!user) {
      throw new Error("Perfil de usuário não encontrado");
    }
    return user;
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
