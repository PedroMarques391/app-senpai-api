import { ObjectId } from "mongodb";
import z from "zod";

export const storeItemSchema = z.object({
  _id: z.instanceof(ObjectId),
  name: z.string().min(3).max(50),
  description: z.string(),
  type: z.enum(["wallpaper", "gift"]),
  price_in_petals: z.number().int().positive(),
  thumbnail_cloudinary_id: z.string(),
  thumbnail_url: z.url(),
  file_cloudinary_id: z.string(),
  file_url: z.url(),
  is_active: z.boolean().default(true),
  created_at: z.coerce.date().default(() => new Date()),
});
