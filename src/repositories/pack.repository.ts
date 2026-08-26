import { MongoInitializer } from "@/init";
import {
  insertStickerPackSchema,
  type CreateStickerPackPayload,
  type PackRepository as IPackRepository,
  type PackRepositoryFindAllResult,
  type PackRepositoryOptions,
  type PaginationOptions,
  type Sticker,
  type StickerPack,
} from "@/models";
import type { Filter, ObjectId } from "mongodb";

export class PackRepository implements IPackRepository {
  private get collection() {
    return MongoInitializer.getDb().collection<StickerPack>("stickerPacks");
  }

  private get stickerCollection() {
    return MongoInitializer.getDb().collection<Sticker>("stickers");
  }

  private async populateStickers(pack: StickerPack): Promise<StickerPack> {
    const stickers = await this.stickerCollection
      .find({ pack_id: pack._id })
      .toArray();
    return {
      ...pack,
      stickers,
    };
  }

  private buildQuery(options?: PackRepositoryOptions): Filter<StickerPack> {
    const filter: Filter<StickerPack> = {};

    if (options?.category) {
      filter.category = options.category;
    }

    if (options?.tags && options.tags.length > 0) {
      filter.tags = { $in: options.tags };
    }

    if (options?.search) {
      filter.$or = [
        { pack_name: { $regex: options.search, $options: "i" } },
        { description: { $regex: options.search, $options: "i" } },
        { publisher: { $regex: options.search, $options: "i" } },
      ];
    }

    return filter;
  }

  async findAll(
    options: PackRepositoryOptions,
    pagination: PaginationOptions,
  ): Promise<PackRepositoryFindAllResult> {
    const filter = this.buildQuery(options);

    const [packs, total] = await Promise.all([
      this.collection
        .find(filter)
        .sort({ created_at: -1 })
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit)
        .toArray(),
      this.collection.countDocuments(filter),
    ]);

    const populatedPacks = await Promise.all(
      packs.map((pack) => this.populateStickers(pack)),
    );

    return {
      packs: populatedPacks,
      total,
    };
  }

  async findById(id: ObjectId): Promise<StickerPack | null> {
    const pack = await this.collection.findOne({ _id: id });
    if (!pack) return null;
    return this.populateStickers(pack);
  }

  async findByUserId(userId: ObjectId): Promise<StickerPack[]> {
    const packs = await this.collection.find({ user_id: userId }).toArray();
    return Promise.all(packs.map((pack) => this.populateStickers(pack)));
  }

  async create(
    packData: CreateStickerPackPayload,
  ): Promise<StickerPack | null> {
    const parsedData = insertStickerPackSchema.parse(packData);

    const result = await this.collection.insertOne(parsedData as StickerPack);
    if (!result.insertedId) return null;
    return this.collection.findOne({ _id: result.insertedId });
  }

  async update(
    id: ObjectId,
    userId: ObjectId,
    updateData: Partial<StickerPack>,
  ): Promise<StickerPack | null> {
    const result = await this.collection.findOneAndUpdate(
      { _id: id, user_id: userId },
      {
        $set: {
          ...updateData,
          updated_at: new Date(),
        },
      },
      { returnDocument: "after" },
    );

    return result;
  }

  async delete(id: ObjectId, userId: ObjectId): Promise<boolean> {
    const result = await this.collection.deleteOne({
      _id: id,
      user_id: userId,
    });

    if (result.deletedCount > 0) {
      await this.stickerCollection.deleteMany({ pack_id: id });
      return true;
    }

    return false;
  }
}
