import type {
  CompleteRegistrationDto,
  PublicProfileDto,
  UpdateUserDto,
} from "@/dtos";
import type { User } from "@/models";
import type { UserRepository } from "@/repositories";
import { AuthUtils, MongoUtils, PermissionUtils } from "@/utils";

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

  async completeRegistration(
    id: string,
    data: CompleteRegistrationDto,
  ): Promise<User | null> {
    const userObjectId = MongoUtils.toObjectId(id, "ID de usuário inválido");
    const user = await this.userRepository.find({ _id: userObjectId });

    if (!user || user.status === "inactive") {
      throw new Error("Perfil de usuário não encontrado");
    }

    const [userWithSameUsername, userWithSameEmail] = await Promise.all([
      this.userRepository.find({ userName: data.userName }),
      this.userRepository.find({ email: data.email }),
    ]);

    if (userWithSameUsername && userWithSameUsername._id.toString() !== id) {
      throw new Error("Este nome de usuário já está em uso");
    }

    if (userWithSameEmail && userWithSameEmail._id.toString() !== id) {
      throw new Error("Este e-mail já está em uso");
    }

    const hashedPassword = await AuthUtils.hashPassword(data.password);

    const updatedUser = await this.userRepository.update(
      { _id: userObjectId },
      {
        name: data.name,
        userName: data.userName,
        email: data.email,
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

    const { userName, email } = updateData;

    if (!currentUser) {
      throw new Error("Perfil de usuário não encontrado");
    }

    if (userName && userName !== currentUser.userName) {
      const hasUserWithSameUsername = await this.userRepository.find({
        userName,
      });
      if (
        hasUserWithSameUsername &&
        hasUserWithSameUsername._id.toString() !== id
      ) {
        throw new Error("Este nome de usuário já está em uso");
      }
    }

    if (email && email !== currentUser.email) {
      const hasUserWithSameEmail = await this.userRepository.find({
        email,
      });
      if (hasUserWithSameEmail && hasUserWithSameEmail._id.toString() !== id) {
        throw new Error("Este e-mail já está em uso");
      }
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
