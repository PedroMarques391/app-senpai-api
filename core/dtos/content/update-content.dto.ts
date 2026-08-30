import {
  createAnnouncementDtoSchema,
  createBannerDtoSchema,
  createNotificationDtoSchema,
} from "./create-content.dto";
import { z } from "zod";

export const updateBannerDtoSchema = createBannerDtoSchema
  .partial()
  .extend({ type: z.literal("banner").optional() })
  .strict();

export const updateNotificationDtoSchema = createNotificationDtoSchema
  .partial()
  .extend({ type: z.literal("notification").optional() })
  .strict();

export const updateAnnouncementDtoSchema = createAnnouncementDtoSchema
  .partial()
  .extend({ type: z.literal("announcement").optional() })
  .strict();

export const updateContentDtoSchema = z.union([
  updateBannerDtoSchema,
  updateNotificationDtoSchema,
  updateAnnouncementDtoSchema,
]);

export type UpdateBannerDto = z.infer<typeof updateBannerDtoSchema>;
export type UpdateNotificationDto = z.infer<typeof updateNotificationDtoSchema>;
export type UpdateAnnouncementDto = z.infer<typeof updateAnnouncementDtoSchema>;
export type UpdateContentDto = z.infer<typeof updateContentDtoSchema>;
