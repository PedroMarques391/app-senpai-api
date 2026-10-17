import { MAX_STICKERS_PER_PACK } from "@/constants";
import { ObjectId } from "mongodb";
import z from "zod";
import { stickerSchema } from "./sticker.schema";

export const PACK_CATEGORIES = [
  "anime",
  "memes",
  "reactions",
  "gaming",
  "cute",
  "utility",
  "other",
] as const;
export const packCategoryEnum = z.enum(PACK_CATEGORIES, {
  message: "Categoria de pacote inválida.",
});
export type PackCategory = z.infer<typeof packCategoryEnum>;

export const PACK_MODERATION_STATUSES = [
  "pending",
  "approved",
  "restricted",
  "banned",
] as const;
export const packModerationStatusEnum = z.enum(PACK_MODERATION_STATUSES, {
  message: "Status de moderação inválido.",
});
export type PackModerationStatus = z.infer<typeof packModerationStatusEnum>;

export const PACK_MODERATION_ACTIONS = [
  "APPROVE",
  "RESTRICT",
  "BAN",
  "DELETE_WITH_STRIKE",
  "DELETE_NO_STRIKE",
] as const;
export const packModerationActionEnum = z.enum(PACK_MODERATION_ACTIONS, {
  message: "Ação de moderação inválida.",
});
export type PackModerationAction = z.infer<typeof packModerationActionEnum>;

export const stickerPackSchema = z.object({
  _id: z.instanceof(ObjectId),
  user_id: z.instanceof(ObjectId),
  description: z.string().max(100),
  pack_name: z.string().min(3).max(30),
  publisher: z.string().min(2).max(30),
  category: packCategoryEnum.default("other"),
  tags: z.array(z.string().min(2).max(20)).max(10).default([]),
  icon_url: z.url().optional(),
  is_public: z.boolean().default(true),
  reports_count: z.number().default(0),
  moderation_status: packModerationStatusEnum.default("approved"),
  downloads_count: z.number().default(0),
  likes_count: z.number().default(0),
  stickers_count: z.number().default(0),
  stickers: z.array(stickerSchema).max(MAX_STICKERS_PER_PACK).optional().default([]),
  created_at: z.coerce.date().default(() => new Date()),
  updated_at: z.coerce.date().default(() => new Date()),
});

