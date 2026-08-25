import type { CreateStickerPayload, Sticker } from "@/models";
import type { ObjectId } from "mongodb";

export interface StickerRepository {
  findAll(): Promise<Sticker[]>;
  findById(id: ObjectId): Promise<Sticker | null>;
  findByUserId(userId: ObjectId): Promise<Sticker[]>;
  findByPackId(packId: ObjectId): Promise<Sticker[]>;
  create(stickerData: CreateStickerPayload): Promise<Sticker | null>;
  update(
    id: ObjectId,
    userId: ObjectId,
    updateData: Partial<Sticker>,
  ): Promise<Sticker | null>;
  delete(id: ObjectId, userId: ObjectId): Promise<boolean>;
}
