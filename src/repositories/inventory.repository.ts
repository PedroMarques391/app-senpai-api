import { MongoInitializer } from "@/init";
import {
  type InventoryItem,
  type StoreItemType,
  type InventoryRepository as IInventoryRepository,
} from "@/models";
import type { ObjectId } from "mongodb";

export class InventoryRepository implements IInventoryRepository {
  private get collection() {
    return MongoInitializer.getDb().collection<InventoryItem>("user_items");
  }

  async findByUserId(userId: ObjectId): Promise<InventoryItem[]> {
    return this.collection
      .find({ user_id: userId })
      .sort({ acquired_at: -1 })
      .toArray();
  }

  async findByUserAndItem(
    userId: ObjectId,
    itemId: ObjectId,
  ): Promise<InventoryItem | null> {
    return this.collection.findOne({ user_id: userId, item_id: itemId });
  }

  async create(
    userId: ObjectId,
    itemId: ObjectId,
    itemType: StoreItemType,
  ): Promise<InventoryItem> {
    const newItem: Omit<InventoryItem, "_id"> = {
      user_id: userId,
      item_id: itemId,
      item_type: itemType,
      acquired_at: new Date(),
    };

    const result = await this.collection.insertOne(newItem as InventoryItem);
    const created = await this.collection.findOne({ _id: result.insertedId });
    if (!created) {
      throw new Error("Falha ao adicionar item ao inventário");
    }
    return created;
  }
}
