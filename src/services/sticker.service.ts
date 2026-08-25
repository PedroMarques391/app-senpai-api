import {
  createStickerDtoSchema,
  updateStickerDtoSchema,
  type CreateStickerDto,
  type UpdateStickerDto,
} from "@/dtos";
import type { Sticker } from "@/models";
import type {
  PackRepository,
  StickerRepository,
  UserRepository,
} from "@/repositories";
import { MongoUtils, PermissionUtils } from "@/utils";

export class StickerService {
  constructor(
    private readonly stickerRepository: StickerRepository,
    private readonly packRepository: PackRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async createSticker(
    packId: string,
    userId: string,
    stickerData: CreateStickerDto,
  ): Promise<Sticker | null> {
    const packObjectId = MongoUtils.toObjectId(packId, "ID do pacote inválido");
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID de usuário inválido",
    );

    const pack = await this.packRepository.findById(packObjectId);
    if (!pack) {
      throw new Error("Pacote não encontrado");
    }

    PermissionUtils.verifyOwnership(pack.user_id, userObjectId, "pacote");

    const parsedData = createStickerDtoSchema.parse(stickerData);

    const sticker = await this.stickerRepository.create({
      ...parsedData,
      pack_id: packObjectId,
      user_id: userObjectId,
    });
    if (!sticker) {
      throw new Error("Failed to create sticker, try again later");
    }

    await this.userRepository.incrementStickersCount(
      userObjectId,
      sticker.type,
      1,
    );

    return sticker;
  }

  async listStickers(): Promise<Sticker[]> {
    const stickers = await this.stickerRepository.findAll();
    return stickers;
  }

  async findSticker(id: string): Promise<Sticker | null> {
    const stickerObjectId = MongoUtils.toObjectId(
      id,
      "ID da figurinha inválido",
    );
    const sticker = await this.stickerRepository.findById(stickerObjectId);
    return sticker;
  }

  async listStickersByUserId(
    userId: string,
    currentUserId: string,
  ): Promise<Sticker[]> {
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID de usuário inválido",
    );
    const currentUserIdObject = MongoUtils.toObjectId(
      currentUserId,
      "ID de usuário inválido",
    );

    const stickers = await this.stickerRepository.findByUserId(userObjectId);
    if (!stickers || stickers.length === 0) {
      return [];
    }

    PermissionUtils.verifyOwnership(
      currentUserIdObject,
      userObjectId,
      "figurinhas do usuário",
    );

    return stickers;
  }

  async listStickersByPackId(packId: string): Promise<Sticker[]> {
    const packObjectId = MongoUtils.toObjectId(packId, "ID do pacote inválido");
    const stickers = await this.stickerRepository.findByPackId(packObjectId);
    if (!stickers) {
      return [];
    }
    return stickers;
  }

  async updateSticker(
    id: string,
    userId: string,
    updateData: UpdateStickerDto,
  ): Promise<Sticker | null> {
    const stickerObjectId = MongoUtils.toObjectId(
      id,
      "ID da figurinha inválido",
    );
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID de usuário inválido",
    );

    const existingSticker =
      await this.stickerRepository.findById(stickerObjectId);
    if (!existingSticker) {
      throw new Error("Figurinha não encontrada");
    }

    PermissionUtils.verifyOwnership(
      existingSticker.user_id,
      userObjectId,
      "figurinha",
    );

    const parsedData = updateStickerDtoSchema.parse(updateData);

    const sticker = await this.stickerRepository.update(
      stickerObjectId,
      userObjectId,
      parsedData,
    );
    if (!sticker) {
      throw new Error("Failed to update sticker, try again later");
    }

    return sticker;
  }

  async deleteSticker(id: string, userId: string): Promise<boolean> {
    const stickerObjectId = MongoUtils.toObjectId(
      id,
      "ID da figurinha inválido",
    );
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID de usuário inválido",
    );

    const existingSticker =
      await this.stickerRepository.findById(stickerObjectId);
    if (!existingSticker) {
      throw new Error("Figurinha não encontrada");
    }

    PermissionUtils.verifyOwnership(
      existingSticker.user_id,
      userObjectId,
      "figurinha",
    );

    const result = await this.stickerRepository.delete(
      stickerObjectId,
      userObjectId,
    );
    if (!result) {
      throw new Error("Failed to delete sticker, try again later");
    }

    await this.userRepository.incrementStickersCount(
      userObjectId,
      existingSticker.type,
      -1,
    );

    return result;
  }
}
