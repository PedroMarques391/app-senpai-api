import { stickerSchema } from "core/schemas/sticker.schema";
import { ObjectId } from "mongodb";
import z from "zod";

export const stickerPackSchema = z.object({
  _id: z.instanceof(ObjectId),
  user_id: z.instanceof(ObjectId),

  pack_name: z.string().min(3).max(30),
  publisher: z.string().min(2).max(30),

  icon_url: z.url(),

  is_public: z.boolean().default(true),
  downloads_count: z.number().default(0),
  stickers: z.array(stickerSchema).min(1).max(30).default([]),

  created_at: z.coerce.date().default(() => new Date()),
  updated_at: z.coerce.date().default(() => new Date()),
});
