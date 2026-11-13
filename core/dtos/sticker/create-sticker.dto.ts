import { stickerSchema } from "@/schemas";
import { z } from "zod";

export const STICKER_FIT_MODES = ["cover", "fill", "contain"] as const;
export const stickerFitEnum = z.enum(STICKER_FIT_MODES, {
  message: "Modo de ajuste de imagem inválido.",
});
export type StickerFit = z.infer<typeof stickerFitEnum>;

export const createStickerDtoSchema = stickerSchema
  .pick({
    name: true,
    author: true,
    cloudinary_id: true,
    file_key: true,
    sticker_url: true,
    emojis: true,
    type: true,
    size_bytes: true,
  })
  .strict();

export type CreateStickerDto = z.infer<typeof createStickerDtoSchema>;
