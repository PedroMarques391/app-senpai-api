import { ObjectId } from "mongodb";
import { z } from "zod";

export const contentTypeEnum = z.enum([
  "banner",
  "notification",
  "announcement",
]);
export type ContentType = z.infer<typeof contentTypeEnum>;

export const contentStatusEnum = z.enum([
  "draft",
  "scheduled",
  "active",
  "expired",
  "archived",
]);
export type ContentStatus = z.infer<typeof contentStatusEnum>;

export const contentPlatformEnum = z.enum(["ios", "android", "both", "all"]);
export type ContentPlatform = z.infer<typeof contentPlatformEnum>;

export const announcementSeverityEnum = z.enum(["info", "warning", "critical"]);
export type AnnouncementSeverity = z.infer<typeof announcementSeverityEnum>;

export const baseContentSchema = z.object({
  _id: z.instanceof(ObjectId),
  title: z.string().min(1).max(120),
  body: z.string().max(500).optional(),
  status: contentStatusEnum.default("active"),
  start_at: z.coerce.date(),
  end_at: z.coerce.date().optional(),
  priority: z.number().int().min(0).default(0),
  platform: contentPlatformEnum.default("all"),
  target_audience: z.string().default("all"),
  created_by: z.instanceof(ObjectId).optional(),
  created_at: z.coerce.date().default(() => new Date()),
  updated_at: z.coerce.date().default(() => new Date()),
});

export const bannerContentSchema = baseContentSchema.extend({
  type: z.literal("banner"),
  image_url: z.string().url(),
  image_cloudinary_id: z.string().optional(),
  cta_label: z.string().max(50).optional(),
  cta_link: z.string().url().optional(),
});

export const notificationContentSchema = baseContentSchema.extend({
  type: z.literal("notification"),
  deep_link: z.string().optional(),
  is_silent: z.boolean().default(false),
});

export const announcementContentSchema = baseContentSchema.extend({
  type: z.literal("announcement"),
  severity: announcementSeverityEnum.default("info"),
  dismissible: z.boolean().default(true),
});

export const contentSchema = z.discriminatedUnion("type", [
  bannerContentSchema,
  notificationContentSchema,
  announcementContentSchema,
]);

export type BannerContent = z.infer<typeof bannerContentSchema>;
export type NotificationContent = z.infer<typeof notificationContentSchema>;
export type AnnouncementContent = z.infer<typeof announcementContentSchema>;
export type Content = z.infer<typeof contentSchema>;
