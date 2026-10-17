import {
  PACK_CATEGORIES,
  PACK_MODERATION_ACTIONS,
  PACK_MODERATION_STATUSES,
  packCategoryEnum,
  packModerationActionEnum,
  packModerationStatusEnum,
  stickerPackSchema,
  type PackCategory,
  type PackModerationAction,
  type PackModerationStatus,
} from "@/schemas";
import { z } from "zod";

export {
  PACK_CATEGORIES,
  PACK_MODERATION_ACTIONS,
  PACK_MODERATION_STATUSES,
  packCategoryEnum,
  packModerationActionEnum,
  packModerationStatusEnum,
};
export type { PackCategory, PackModerationAction, PackModerationStatus };

export const insertStickerPackSchema = stickerPackSchema.omit({ _id: true });
export type StickerPack = z.infer<typeof stickerPackSchema>;
export type CreateStickerPackPayload = z.input<typeof insertStickerPackSchema>;
