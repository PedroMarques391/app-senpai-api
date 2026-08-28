import { ObjectId } from "mongodb";
import z from "zod";

export const storeItemTypeEnum = z.enum([
  "wallpaper",
  "gift",
  "badge",
  "border",
  "profile_frame",
  "profile_picture",
  "premium_subscription",
  "other",
]);
export type StoreItemType = z.infer<typeof storeItemTypeEnum>;

export const storeItemSchema = z.object({
  _id: z.instanceof(ObjectId),
  name: z.string().min(3).max(50),
  description: z.string(),
  type: storeItemTypeEnum,
  price_in_petals: z.number().int().nonnegative(),
  purchases_count: z.number().int().default(0),
  thumbnail_cloudinary_id: z.string(),
  thumbnail_url: z.url(),
  file_cloudinary_id: z.string().optional(),
  file_url: z.url().optional(),
  is_active: z.boolean().default(true),
  created_at: z.coerce.date().default(() => new Date()),
  updated_at: z.coerce.date().default(() => new Date()),
});
