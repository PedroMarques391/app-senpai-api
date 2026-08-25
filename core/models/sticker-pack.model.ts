import { stickerPackSchema } from "core/schemas";
import { z } from "zod";

export const insertStickerPackSchema = stickerPackSchema.omit({ _id: true });
export type StickerPack = z.infer<typeof stickerPackSchema>;
export type CreateStickerPackPayload = z.input<typeof insertStickerPackSchema>;
