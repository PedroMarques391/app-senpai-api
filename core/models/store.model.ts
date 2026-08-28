import { storeItemSchema, storeItemTypeEnum, type StoreItemType } from "@/schemas";
import z from "zod";

export const insertStoreItemSchema = storeItemSchema.omit({ _id: true });
export type StoreItem = z.infer<typeof storeItemSchema>;
export type CreateStoreItemPayload = z.input<typeof insertStoreItemSchema>;

export { storeItemTypeEnum, type StoreItemType };
