import {
  packCategoryEnum,
  packModerationStatusEnum,
  stickerPackSchema,
  type PackModerationStatus,
} from "@/schemas";
import { z } from "zod";

export { packCategoryEnum, packModerationStatusEnum };
export type { PackCategory, PackModerationStatus };
type PackCategory = z.infer<typeof packCategoryEnum>;

export const insertStickerPackSchema = stickerPackSchema.omit({ _id: true });
export type StickerPack = z.infer<typeof stickerPackSchema>;
export type CreateStickerPackPayload = z.input<typeof insertStickerPackSchema>;

