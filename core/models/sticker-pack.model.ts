import { packCategoryEnum, stickerPackSchema } from "core/schemas";
import { z } from "zod";

export { packCategoryEnum };
export type PackCategory = z.infer<typeof packCategoryEnum>;

export const insertStickerPackSchema = stickerPackSchema.omit({ _id: true });
export type StickerPack = z.infer<typeof stickerPackSchema>;
export type CreateStickerPackPayload = z.input<typeof insertStickerPackSchema>;
