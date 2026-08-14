import { ObjectId } from "mongodb";
import z from "zod";

export const stickerSchema = z.object({
  _id: z.instanceof(ObjectId),
  user_id: z.instanceof(ObjectId),
  name: z.string(),
  author: z.string(),
  pack_name: z.string(),
  cloudinary_id: z.string(),
  sticker_url: z.url().optional(),
  emojis: z.array(z.string()).max(3).default([]),
  created_at: z.coerce.date().default(() => new Date()),
  type: z.enum(["dynamic", "static"]),
});


