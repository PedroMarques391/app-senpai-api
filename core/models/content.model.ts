import {
  announcementContentSchema,
  announcementSeverityEnum,
  bannerContentSchema,
  contentPlatformEnum,
  contentSchema,
  contentStatusEnum,
  contentTypeEnum,
  notificationContentSchema,
  type AnnouncementContent,
  type AnnouncementSeverity,
  type BannerContent,
  type Content,
  type ContentPlatform,
  type ContentStatus,
  type ContentType,
  type NotificationContent,
} from "@/schemas";
import { z } from "zod";

export const insertBannerSchema = bannerContentSchema.omit({ _id: true });
export const insertNotificationSchema = notificationContentSchema.omit({
  _id: true,
});
export const insertAnnouncementSchema = announcementContentSchema.omit({
  _id: true,
});

export const insertContentSchema = z.discriminatedUnion("type", [
  insertBannerSchema,
  insertNotificationSchema,
  insertAnnouncementSchema,
]);

export type CreateContentPayload = Omit<
  z.input<typeof insertContentSchema>,
  "created_by"
>;

export {
  announcementSeverityEnum,
  contentPlatformEnum,
  contentSchema,
  contentStatusEnum,
  contentTypeEnum,
  type AnnouncementContent,
  type AnnouncementSeverity,
  type BannerContent,
  type Content,
  type ContentPlatform,
  type ContentStatus,
  type ContentType,
  type NotificationContent,
};
