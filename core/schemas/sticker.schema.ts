import { ObjectId } from "mongodb";
import z from "zod";

export const STICKER_TYPES = ["dynamic", "static"] as const;
export const stickerTypeEnum = z.enum(STICKER_TYPES);
export type StickerType = z.infer<typeof stickerTypeEnum>;

export const stickerSchema = z.object({
  _id: z.instanceof(ObjectId),
  user_id: z.instanceof(ObjectId),
  pack_id: z.instanceof(ObjectId),
  name: z.string(),
  author: z.string(),
  cloudinary_id: z.string(),
  sticker_url: z.url(),
  emojis: z.array(z.string()).max(3).default([]),
  created_at: z.coerce.date().default(() => new Date()),
  type: stickerTypeEnum,
  size_bytes: z.number().nonnegative().default(0),
});
