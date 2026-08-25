import type {
  CreateStickerPackPayload,
  StickerPack,
} from "core/models/sticker-pack.model";
import type { ObjectId } from "mongodb";

export interface PackRepository {
  findAll(): Promise<StickerPack[]>;
  findById(id: ObjectId): Promise<StickerPack | null>;
  findByUserId(userId: ObjectId): Promise<StickerPack[]>;
  create(packData: CreateStickerPackPayload): Promise<StickerPack | null>;
  update(
    id: ObjectId,
    userId: ObjectId,
    updateData: Partial<StickerPack>,
  ): Promise<StickerPack | null>;
  delete(id: ObjectId, userId: ObjectId): Promise<boolean>;
}
