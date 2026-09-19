import {
  storeItemSchema,
  storeItemStatusEnum,
  storeItemTypeEnum,
  type StoreItemStatus,
  type StoreItemType,
} from "@/schemas";
import z from "zod";

import type { InventoryItem } from "./inventory-item.model";

export const insertStoreItemSchema = storeItemSchema.omit({ _id: true });
export type StoreItem = z.infer<typeof storeItemSchema>;
export type CreateStoreItemPayload = z.input<typeof insertStoreItemSchema>;

export interface PurchaseResult {
  item: InventoryItem;
  newBalance: number;
}

export {
  storeItemStatusEnum,
  storeItemTypeEnum,
  type StoreItemStatus,
  type StoreItemType,
};
