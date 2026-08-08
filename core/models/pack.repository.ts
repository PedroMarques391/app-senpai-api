import type { CreatePackDto, UpdatePackDto } from "core/dtos";
import type { StickerPack } from "core/models/sticker-pack.model";
import type { ObjectId } from "mongodb";

export interface PackRepository {
  findAll(): Promise<StickerPack[]>;
  findById(id: ObjectId): Promise<StickerPack | null>;
  findByUserId(userId: ObjectId): Promise<StickerPack[]>;
  create(
    userId: ObjectId,
    publisher: string,
    packData: CreatePackDto,
  ): Promise<StickerPack | null>;
  update(
    id: ObjectId,
    userId: ObjectId,
    updateData: UpdatePackDto,
  ): Promise<StickerPack | null>;
  delete(id: ObjectId, userId: ObjectId): Promise<boolean>;
}
