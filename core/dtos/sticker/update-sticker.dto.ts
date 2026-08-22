import { stickerSchema } from "@/schemas";
import type { z } from "zod";

export const updateStickerDtoSchema = stickerSchema.pick({
  name: true,
  author: true,
  emojis: true,
});

export type UpdateStickerDto = z.infer<typeof updateStickerDtoSchema>;
