import { updatePackDtoSchema, type CreatePackDto, type UpdatePackDto } from "@/dtos";
import { MongoInitializer } from "@/init";
import type { PackRepository as IPackRepository, Sticker, StickerPack } from "@/models";
import { stickerPackSchema } from "@/schemas";
import type { ObjectId } from "mongodb";

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

  async findAll(): Promise<StickerPack[]> {
    const packs = await this.collection.find().toArray();
    return Promise.all(packs.map((pack) => this.populateStickers(pack)));
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

    if (result.deletedCount > 0) {
      await this.stickerCollection.deleteMany({ pack_id: id });
      return true;
    }

    return false;
  }
}
