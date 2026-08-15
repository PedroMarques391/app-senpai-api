import { stickerSchema } from "@/schemas";
import type { z } from "zod";

export const createStickerDtoSchema = stickerSchema.pick({
  name: true,
  author: true,
  cloudinary_id: true,
  sticker_url: true,
  emojis: true,
  type: true,
});


export type CreateStickerDto = z.infer<typeof createStickerDtoSchema>;
