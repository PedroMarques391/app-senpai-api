import { MongoInitializer } from "@/init";
import {
  type PackFavorite,
  type PackFavoriteRepository as IPackFavoriteRepository,
} from "@/models";
import type { ObjectId } from "mongodb";

export class PackFavoriteRepository implements IPackFavoriteRepository {
  private get collection() {
    return MongoInitializer.getDb().collection<PackFavorite>("pack_favorites");
  }

  async findByUserAndPack(
    userId: ObjectId,
    packId: ObjectId,
  ): Promise<PackFavorite | null> {
    return this.collection.findOne({ user_id: userId, pack_id: packId });
  }

  async findByUserId(userId: ObjectId): Promise<PackFavorite[]> {
    return this.collection
      .find({ user_id: userId })
      .sort({ created_at: -1 })
      .toArray();
  }

  async create(userId: ObjectId, packId: ObjectId): Promise<PackFavorite> {
    const newFavorite: Omit<PackFavorite, "_id"> = {
      user_id: userId,
      pack_id: packId,
      created_at: new Date(),
    };

    const result = await this.collection.insertOne(
      newFavorite as PackFavorite,
    );
    const created = await this.collection.findOne({ _id: result.insertedId });
    if (!created) {
      throw new Error("Falha ao adicionar pacote aos favoritos");
    }
    return created;
  }

  async delete(userId: ObjectId, packId: ObjectId): Promise<boolean> {
    const result = await this.collection.deleteOne({
      user_id: userId,
      pack_id: packId,
    });
    return result.deletedCount > 0;
  }
}
