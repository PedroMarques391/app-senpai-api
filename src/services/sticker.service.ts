import type { CreateStickerDto, UpdateStickerDto } from "@/dtos";
import type { Sticker } from "@/models";
import type { StickerRepository } from "@/repositories";
import { MongoUtils } from "@/utils";
import type { ObjectId } from "mongodb";

export class StickerService {
  constructor(private readonly stickerRepository: StickerRepository) {}

  async create(
    userId: string | ObjectId,
    stickerData: CreateStickerDto,
  ): Promise<Sticker | null> {
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID de usuário inválido",
    );

    const sticker = await this.stickerRepository.create(
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
      throw new Error("Sticker not found");
    }

    if (existingSticker.user_id.toString() !== userObjectId.toString()) {
      throw new Error("Operation not permitted: You do not own this sticker");
    }

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
      throw new Error("Sticker not found");
    }

    if (existingSticker.user_id.toString() !== userObjectId.toString()) {
      throw new Error("Operation not permitted: You do not own this sticker");
    }

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
