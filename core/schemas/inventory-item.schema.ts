import { ObjectId } from "mongodb";
import { z } from "zod";
import { storeItemTypeEnum, type StoreItemType } from "./store.schema";

export const inventoryItemSchema = z.object({
  _id: z.instanceof(ObjectId),
  user_id: z.instanceof(ObjectId),
  item_id: z.instanceof(ObjectId),
  item_type: storeItemTypeEnum,
  acquired_at: z.coerce.date().default(() => new Date()),
});

export const inventoryItemTypeEnum = storeItemTypeEnum;
export type InventoryItemType = StoreItemType;

export { storeItemTypeEnum, type StoreItemType };
