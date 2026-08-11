import { updatePackDtoSchema, type CreatePackDto, type UpdatePackDto } from "@/dtos";
import { MongoInitializer } from "@/init";
import type { PackRepository as IPackRepository, StickerPack } from "@/models";
import { stickerPackSchema } from "@/schemas";
import type { ObjectId } from "mongodb";

export class PackRepository implements IPackRepository {
  private get collection() {
    return MongoInitializer.getDb().collection<StickerPack>("stickerPacks");
  }

  async findAll(): Promise<StickerPack[]> {
    const packs = await this.collection.find().toArray();
    return packs;
  }

  async findById(id: ObjectId): Promise<StickerPack | null> {
    const pack = await this.collection.findOne({ _id: id });
    return pack;
  }

  async findByUserId(userId: ObjectId): Promise<StickerPack[]> {
    const packs = await this.collection.find({ user_id: userId }).toArray();
    return packs;
  }

  async create(
    userId: ObjectId,
    publisher: string,
    packData: CreatePackDto,
  ): Promise<StickerPack | null> {
    const insertSchema = stickerPackSchema.omit({ _id: true });
    const parsedData = insertSchema.parse({
      ...packData,
      user_id: userId,
      publisher,
    });

    const result = await this.collection.insertOne(parsedData as StickerPack);
    if (!result.insertedId) return null;
    return this.collection.findOne({ _id: result.insertedId });
  }

  async update(
    id: ObjectId,
    userId: ObjectId,
    updateData: UpdatePackDto,
  ): Promise<StickerPack | null> {
    const parsedData = updatePackDtoSchema.parse(updateData);

    const result = await this.collection.findOneAndUpdate(
      { _id: id, user_id: userId },
      {
        $set: {
          ...parsedData,
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
