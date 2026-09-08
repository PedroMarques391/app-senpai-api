import type { PackFavoriteRepository, PackRepository } from "@/repositories";
import { MongoUtils } from "@/utils";

export class PackFavoriteService {
  constructor(
    private readonly packFavoriteRepository: PackFavoriteRepository,
    private readonly packRepository: PackRepository,
  ) { }

  async toggleFavorite(
    packId: string,
    userId: string,
  ): Promise<{ isFavorite: boolean }> {
    const packObjectId = MongoUtils.toObjectId(packId, "ID do pacote inválido");
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID de usuário inválido",
    );

    const existingPack = await this.packRepository.findById(packObjectId);
    if (!existingPack) {
      throw new Error("Pacote não encontrado");
    }

    const existingFavorite =
      await this.packFavoriteRepository.findByUserAndPack(
        userObjectId,
        packObjectId,
      );

    if (existingFavorite) {
      await this.packFavoriteRepository.delete(userObjectId, packObjectId);
      await this.packRepository.updateLikesCount(packObjectId, -1);
      return { isFavorite: false };
    }

    await this.packFavoriteRepository.create(userObjectId, packObjectId);
    await this.packRepository.updateLikesCount(packObjectId, 1);
    return { isFavorite: true };
  }

  async isFavorite(packId: string, userId: string): Promise<boolean> {
    const packObjectId = MongoUtils.toObjectId(packId, "ID do pacote inválido");
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID de usuário inválido",
    );

    const favorite = await this.packFavoriteRepository.findByUserAndPack(
      userObjectId,
      packObjectId,
    );
    return !!favorite;
  }
}
