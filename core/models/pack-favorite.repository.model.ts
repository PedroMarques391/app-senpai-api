import type { PackFavorite } from "@/models";
import type { ObjectId } from "mongodb";

export interface PackFavoriteRepository {
  findByUserAndPack(
    userId: ObjectId,
    packId: ObjectId,
  ): Promise<PackFavorite | null>;
  findByUserId(userId: ObjectId): Promise<PackFavorite[]>;
  create(userId: ObjectId, packId: ObjectId): Promise<PackFavorite>;
  delete(userId: ObjectId, packId: ObjectId): Promise<boolean>;
}
