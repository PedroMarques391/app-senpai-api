import { stickerSchema } from "@/schemas";
import type { z } from "zod";

export const createStickerDtoSchema = stickerSchema.pick({
  cloudinary_id: true,
  url: true,
  emojis: true,
  type: true,
});

export type CreateStickerDto = z.infer<typeof createStickerDtoSchema>;
