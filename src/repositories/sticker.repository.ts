import { updateStickerDtoSchema, type CreateStickerDto, type UpdateStickerDto } from "@/dtos";
import { MongoInitializer } from "@/init";
import type { Sticker, StickerRepository as IStickerRepository } from "@/models";
import { stickerSchema } from "@/schemas";
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

  async create(
    userId: ObjectId,
    stickerData: CreateStickerDto,
    cloudinaryId: string,
    stickerUrl: string,
  ): Promise<Sticker | null> {
    const insertSchema = stickerSchema.omit({ _id: true });
    const parsedData = insertSchema.parse({
      ...stickerData,
      user_id: userId,
      cloudinary_id: cloudinaryId,
      sticker_url: stickerUrl,
    });

    const result = await this.collection.insertOne(parsedData as Sticker);
    if (!result.insertedId) return null;
    return this.collection.findOne({ _id: result.insertedId });
  }

  async update(
    id: ObjectId,
    userId: ObjectId,
    updateData: UpdateStickerDto,
  ): Promise<Sticker | null> {
    const parsedData = updateStickerDtoSchema.parse(updateData);

    const result = await this.collection.findOneAndUpdate(
      { _id: id, user_id: userId },
      {
        $set: {
          ...parsedData,
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
