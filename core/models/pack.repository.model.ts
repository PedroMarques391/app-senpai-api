import type { PackRepositoryOptions } from "@/dtos";
import type { CreateStickerPackPayload, StickerPack } from "@/models";
import type { PaginationOptions, RepositoryPaginatedResult } from "@/types";
import type { ObjectId } from "mongodb";

export interface PackRepository {
  findAll(
    options: PackRepositoryOptions,
    paginationOptions: PaginationOptions,
  ): Promise<RepositoryPaginatedResult<StickerPack>>;
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
