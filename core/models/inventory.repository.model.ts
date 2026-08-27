import type { InventoryItem, InventoryItemType } from "@/models";
import type { ObjectId } from "mongodb";

export interface InventoryRepository {
  findByUserId(userId: ObjectId): Promise<InventoryItem[]>;
  findByUserAndItem(
    userId: ObjectId,
    itemId: ObjectId,
  ): Promise<InventoryItem | null>;
  create(
    userId: ObjectId,
    itemId: ObjectId,
    itemType: InventoryItemType,
  ): Promise<InventoryItem>;
}
