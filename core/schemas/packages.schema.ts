import { ObjectId } from "mongodb";
import z from "zod";
import { stickerSchema } from "./sticker.schema";

export const packCategoryEnum = z.enum([
  "anime",
  "memes",
  "reactions",
  "gaming",
  "cute",
  "utility",
  "other",
]);

export const stickerPackSchema = z.object({
  _id: z.instanceof(ObjectId),
  user_id: z.instanceof(ObjectId),
  description: z.string().max(100),
  pack_name: z.string().min(3).max(30),
  publisher: z.string().min(2).max(30),
  category: packCategoryEnum.default("other"),
  tags: z.array(z.string().min(2).max(20)).max(10).default([]),
  icon_url: z.url().optional(),
  is_public: z.boolean().default(true),
  downloads_count: z.number().default(0),
  likes_count: z.number().default(0),
  stickers: z.array(stickerSchema).max(30).optional().default([]),
  created_at: z.coerce.date().default(() => new Date()),
  updated_at: z.coerce.date().default(() => new Date()),
});
