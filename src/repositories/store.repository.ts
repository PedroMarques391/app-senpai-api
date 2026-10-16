import { MongoInitializer } from "@/init";
import {
  insertStoreItemSchema,
  type CreateStoreItemPayload,
  type StoreRepository as IStoreRepository,
  type StoreItem,
  type StoreItemIdentifier,
  type StoreItemStatus,
} from "@/models";
import type { ObjectId } from "mongodb";

export class StoreRepository implements IStoreRepository {
  private get collection() {
    return MongoInitializer.getDb().collection<StoreItem>("store_items");
  }

  async find(filter: StoreItemIdentifier): Promise<StoreItem | null> {
    return this.collection.findOne(filter);
  }

  async findAll(status?: StoreItemStatus): Promise<StoreItem[]> {
    const filter = status ? { status } : {};
    const items = await this.collection.find(filter).toArray();
    return items;
  }

  async findById(id: ObjectId): Promise<StoreItem | null> {
    return this.find({ _id: id });
  }

  async create(data: CreateStoreItemPayload): Promise<StoreItem> {
    const parsed = insertStoreItemSchema.parse(data);
    const result = await this.collection.insertOne(parsed as StoreItem);
    const created = await this.collection.findOne({ _id: result.insertedId });
    if (!created) throw new Error("Não foi possível criar o item da loja. Tente novamente.");
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

  async incrementPurchasesCount(id: ObjectId): Promise<void> {
    await this.collection.updateOne(
      { _id: id },
      { $inc: { purchases_count: 1 } },
    );
  }
}
