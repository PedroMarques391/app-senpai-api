import type { CreateStickerDto, UpdateStickerDto } from "@/dtos";
import type { Sticker } from "@/models";
import type { ObjectId } from "mongodb";

export interface StickerRepository {
  findAll(): Promise<Sticker[]>;
  findById(id: ObjectId): Promise<Sticker | null>;
  findByUserId(userId: ObjectId): Promise<Sticker[]>;
  findByPackId(packId: ObjectId): Promise<Sticker[]>;
  create(
    packId: ObjectId,
    userId: ObjectId,
    stickerData: CreateStickerDto,
  ): Promise<Sticker | null>;
  update(
    id: ObjectId,
    userId: ObjectId,
    updateData: UpdateStickerDto,
  ): Promise<Sticker | null>;
  delete(id: ObjectId, userId: ObjectId): Promise<boolean>;
  deleteByPackId(packId: ObjectId): Promise<number>;
}
