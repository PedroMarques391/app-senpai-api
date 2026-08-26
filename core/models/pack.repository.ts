import type {
  CreateStickerPackPayload,
  PackCategory,
  StickerPack,
} from "core/models/sticker-pack.model";
import type { ObjectId } from "mongodb";

export interface PackRepositoryOptions {
  category?: PackCategory;
  tags?: string[];
  search?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PackRepositoryFindAllResult {
  packs: StickerPack[];
  total: number;
}

export interface PaginatedPacksResult {
  packs: StickerPack[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PackRepository {
  findAll(
    options: PackRepositoryOptions,
    paginationOptions: PaginationOptions,
  ): Promise<PackRepositoryFindAllResult>;
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
