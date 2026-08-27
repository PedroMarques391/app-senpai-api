import { ObjectId } from "mongodb";
import { z } from "zod";

export const inventoryItemTypeEnum = z.enum([
  "wallpaper",
  "gift",
  "badge",
  "border",
  "profile_frame",
  "profile_picture",
  "premium_subscription",
  "other",
]);
export type InventoryItemType = z.infer<typeof inventoryItemTypeEnum>;

export const inventoryItemSchema = z.object({
  _id: z.instanceof(ObjectId),
  user_id: z.instanceof(ObjectId),
  item_id: z.instanceof(ObjectId),
  item_type: inventoryItemTypeEnum,
  acquired_at: z.coerce.date().default(() => new Date()),
});
