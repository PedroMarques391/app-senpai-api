import { ObjectId } from "mongodb";
import { z } from "zod";

export const inventoryItemSchema = z.object({
  item_id: z.instanceof(ObjectId),
  type: z.enum(["wallpaper", "gift"]),
  name: z.string(),
  thumbnail_url: z.url().optional(),
  file_url: z.url().optional(),
  acquired_at: z.coerce.date().default(() => new Date()),
});

export const inventorySchema = z.object({
  _id: z.instanceof(ObjectId),
  user_id: z.instanceof(ObjectId),
  items: z.array(inventoryItemSchema).default([]),
  created_at: z.coerce.date().default(() => new Date()),
  updated_at: z.coerce.date().default(() => new Date()),
});
