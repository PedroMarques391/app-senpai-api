import {
  storeItemSchema,
  storeItemStatusEnum,
  storeItemTypeEnum,
  type StoreItemStatus,
  type StoreItemType,
} from "@/schemas";
import z from "zod";

export const insertStoreItemSchema = storeItemSchema.omit({ _id: true });
export type StoreItem = z.infer<typeof storeItemSchema>;
export type CreateStoreItemPayload = z.input<typeof insertStoreItemSchema>;

export interface PurchaseResult {
  code: string;
  name: string;
  price_in_petals: number;
  newBalance: number;
}

export {
  storeItemStatusEnum,
  storeItemTypeEnum,
  type StoreItemStatus,
  type StoreItemType,
};
