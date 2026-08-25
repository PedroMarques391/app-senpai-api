import { MongoInitializer } from "@/init";
import type {
  CreateStoreItemPayload,
  StoreRepository as IStoreRepository,
  StoreItem,
} from "@/models";
import { storeItemSchema } from "@/schemas";
import type { ObjectId } from "mongodb";

export class StoreRepository implements IStoreRepository {
  private get collection() {
    return MongoInitializer.getDb().collection<StoreItem>("STORE_ITEMS");
  }

  async findAll(): Promise<StoreItem[]> {
    return this.collection.find({ is_active: true }).toArray();
  }

  async findById(id: ObjectId): Promise<StoreItem | null> {
    return this.collection.findOne({ _id: id });
  }

  async create(data: CreateStoreItemPayload): Promise<StoreItem> {
    const parsed = storeItemSchema.omit({ _id: true }).parse(data);
    const result = await this.collection.insertOne(parsed as StoreItem);
    const created = await this.collection.findOne({ _id: result.insertedId });
    if (!created) throw new Error("Failed to create store item");
    return created;
  }

  async update(
    id: ObjectId,
    data: Partial<StoreItem>,
  ): Promise<StoreItem | null> {
    return this.collection.findOneAndUpdate(
      { _id: id },
      { $set: { ...data, updated_at: new Date() } },
      { returnDocument: "after" },
    );
  }

  async delete(id: ObjectId): Promise<boolean> {
    const result = await this.collection.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }
}
