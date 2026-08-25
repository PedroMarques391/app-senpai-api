import { MongoInitializer } from "@/init";
import {
  insertStickerSchema,
  type CreateStickerPayload,
  type Sticker,
  type StickerRepository as IStickerRepository,
} from "@/models";
import type { ObjectId } from "mongodb";

export class StickerRepository implements IStickerRepository {
  private get collection() {
    return MongoInitializer.getDb().collection<Sticker>("stickers");
  }

  async findAll(): Promise<Sticker[]> {
    const stickers = await this.collection.find().toArray();
    return stickers;
  }

  async findById(id: ObjectId): Promise<Sticker | null> {
    const sticker = await this.collection.findOne({ _id: id });
    return sticker;
  }

  async findByUserId(userId: ObjectId): Promise<Sticker[]> {
    const stickers = await this.collection.find({ user_id: userId }).toArray();
    return stickers;
  }

  async findByPackId(packId: ObjectId): Promise<Sticker[]> {
    const stickers = await this.collection.find({ pack_id: packId }).toArray();
    return stickers;
  }

  async create(stickerData: CreateStickerPayload): Promise<Sticker | null> {
    const parsedData = insertStickerSchema.parse(stickerData);

    const result = await this.collection.insertOne(parsedData as Sticker);
    if (!result.insertedId) return null;
    return this.collection.findOne({ _id: result.insertedId });
  }

  async update(
    id: ObjectId,
    userId: ObjectId,
    updateData: Partial<Sticker>,
  ): Promise<Sticker | null> {
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
    return result.deletedCount > 0;
  }
}
