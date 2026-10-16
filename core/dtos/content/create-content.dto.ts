import {
  announcementContentSchema,
  bannerContentSchema,
  notificationContentSchema,
} from "@/schemas";
import { z } from "zod";

const omitFields = {
  _id: true,
  created_by: true,
  created_at: true,
  updated_at: true,
} as const;

export const createBannerDtoSchema = bannerContentSchema
  .omit(omitFields)
  .strict();

export const createNotificationDtoSchema = notificationContentSchema
  .omit(omitFields)
  .strict();

export const createAnnouncementDtoSchema = announcementContentSchema
  .omit(omitFields)
  .strict();

export const createContentDtoSchema = z
  .discriminatedUnion("type", [
    createBannerDtoSchema,
    createNotificationDtoSchema,
    createAnnouncementDtoSchema,
  ])
  .refine(
    (data) => !data.end_at || new Date(data.end_at) > new Date(data.start_at),
    {
      message: "A data de término deve ser posterior à data de início.",
      path: ["end_at"],
    },
  );

export type CreateContentDto = z.infer<typeof createContentDtoSchema>;
