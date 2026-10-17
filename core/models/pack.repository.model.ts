import type { PackRepositoryOptions } from "@/dtos";
import type {
  CreateStickerPackPayload,
  PackModerationStatus,
  StickerPack,
} from "@/models";
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
  updateLikesCount(packId: ObjectId, delta: 1 | -1): Promise<void>;
  incrementDownloadsCount(packId: ObjectId): Promise<boolean>;
  incrementStickersCount(packId: ObjectId, value: number): Promise<void>;
  incrementReportsCount(
    packId: ObjectId,
    shouldHide: boolean,
  ): Promise<StickerPack | null>;
  updateModerationStatus(
    packId: ObjectId,
    expectedStatus: PackModerationStatus,
    status: PackModerationStatus,
    isPublic: boolean,
    resetReports: boolean,
  ): Promise<StickerPack | null>;
  deleteByModerationStatus(
    packId: ObjectId,
    expectedStatus: PackModerationStatus,
  ): Promise<StickerPack | null>;
}

