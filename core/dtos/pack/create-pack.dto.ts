import { createStickerDtoSchema } from "../sticker/create-sticker.dto";
import { stickerPackSchema } from "core/schemas";
import z from "zod";

export const createPackDtoSchema = stickerPackSchema
  .pick({
    pack_name: true,
    icon_url: true,
    is_public: true,
    category: true,
  })
  .extend({
    description: z.string().max(100).optional().default("Sem descrição"),
    tags: z.array(z.string().min(2).max(20)).max(10).optional().default([]),
    stickers: z.array(createStickerDtoSchema).optional(),
  })
  .strict();

export type CreatePackDto = z.infer<typeof createPackDtoSchema>;
