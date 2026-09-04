import type { User } from "@/models";
import type { UserRepository } from "@/repositories";
import { MongoUtils } from "@/utils";

export class TermsService {
  constructor(private readonly userRepository: UserRepository) {}

  async acceptTerms(userId: string): Promise<User> {
    const userObjectId = MongoUtils.toObjectId(userId, "ID de usuário inválido");
    const user = await this.userRepository.find({ _id: userObjectId });

    if (!user || user.status === "inactive") {
      throw new Error("Usuário não encontrado");
    }

    const updatedUser = await this.userRepository.update(
      { _id: userObjectId },
      { termsAccepted: true, updatedAt: new Date() },
    );

    if (!updatedUser) {
      throw new Error("Falha ao aceitar os termos de uso");
    }

    return updatedUser;
  }

  async removeTermsAcceptance(userId: string): Promise<User> {
    const userObjectId = MongoUtils.toObjectId(userId, "ID de usuário inválido");
    const user = await this.userRepository.find({ _id: userObjectId });

    if (!user || user.status === "inactive") {
      throw new Error("Usuário não encontrado");
    }

    const updatedUser = await this.userRepository.update(
      { _id: userObjectId },
      { termsAccepted: false, updatedAt: new Date() },
    );

    if (!updatedUser) {
      throw new Error("Falha ao remover o aceite dos termos de uso");
    }

    return updatedUser;
  }
}
