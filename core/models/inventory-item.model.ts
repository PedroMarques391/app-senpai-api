import {
  inventoryItemSchema,
  inventoryItemTypeEnum,
  type InventoryItemType,
} from "@/schemas";
import { z } from "zod";

export const insertInventoryItemSchema = inventoryItemSchema.omit({
  _id: true,
});

export type InventoryItem = z.infer<typeof inventoryItemSchema>;
export type CreateInventoryItemPayload = z.input<
  typeof insertInventoryItemSchema
>;

export { inventoryItemTypeEnum, type InventoryItemType };
