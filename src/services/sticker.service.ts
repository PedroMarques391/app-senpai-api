import type { CreateStickerDto, UpdateStickerDto } from "@/dtos";
import type { Sticker } from "@/models";
import type { StickerRepository } from "@/repositories";
import { MongoUtils, PermissionUtils } from "@/utils";
import type { ObjectId } from "mongodb";

export class StickerService {
  constructor(private readonly stickerRepository: StickerRepository) { }

  async create(
    packId: string | ObjectId,
    userId: string | ObjectId,
    stickerData: CreateStickerDto,
  ): Promise<Sticker | null> {
    const packObjectId = MongoUtils.toObjectId(
      packId,
      "ID do pacote inválido",
    );
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID de usuário inválido",
    );

    const sticker = await this.stickerRepository.create(
      packObjectId,
      userObjectId,
      stickerData,
    );
    if (!sticker) {
      throw new Error("Failed to create sticker, try again later");
    }
    return sticker;
  }

  async findAll(): Promise<Sticker[]> {
    const stickers = await this.stickerRepository.findAll();
    return stickers;
  }

  async findById(id: string | ObjectId): Promise<Sticker | null> {
    const stickerObjectId = MongoUtils.toObjectId(
      id,
      "ID da figurinha inválido",
    );
    const sticker = await this.stickerRepository.findById(stickerObjectId);
    return sticker;
  }

  async findByUserId(userId: string | ObjectId): Promise<Sticker[]> {
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID de usuário inválido",
    );
    const stickers = await this.stickerRepository.findByUserId(userObjectId);
    if (!stickers) {
      return [];
    }
    return stickers;
  }

  async findByPackId(packId: string | ObjectId): Promise<Sticker[]> {
    const packObjectId = MongoUtils.toObjectId(
      packId,
      "ID do pacote inválido",
    );
    const stickers = await this.stickerRepository.findByPackId(packObjectId);
    if (!stickers) {
      return [];
    }
    return stickers;
  }

  async update(
    id: string | ObjectId,
    userId: string | ObjectId,
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

    PermissionUtils.verifyOwnership(existingSticker.user_id, userObjectId, "figurinha");

    const sticker = await this.stickerRepository.update(
      stickerObjectId,
      userObjectId,
      updateData,
    );
    if (!sticker) {
      throw new Error("Failed to update sticker, try again later");
    }

    return sticker;
  }

  async delete(
    id: string | ObjectId,
    userId: string | ObjectId,
  ): Promise<boolean> {
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

    PermissionUtils.verifyOwnership(existingSticker.user_id, userObjectId, "figurinha");

    const result = await this.stickerRepository.delete(
      stickerObjectId,
      userObjectId,
    );
    if (!result) {
      throw new Error("Failed to delete sticker, try again later");
    }

    return result;
  }
}
