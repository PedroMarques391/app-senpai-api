import {
  contentPlatformEnum,
  contentStatusEnum,
  contentTypeEnum,
} from "@/schemas";
import { z } from "zod";

export const activeContentParamsSchema = z.object({
  type: contentTypeEnum.optional(),
  platform: contentPlatformEnum.optional(),
  now: z.coerce.date(),
});

export const contentFilterSchema = z.object({
  type: contentTypeEnum.optional(),
  status: contentStatusEnum.optional(),
});

export const getActiveContentQuerySchema = z.object({
  type: contentTypeEnum.optional(),
  platform: contentPlatformEnum.optional(),
});

export const listContentAdminQuerySchema = z.object({
  type: contentTypeEnum.optional(),
  status: contentStatusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ActiveContentParams = z.infer<typeof activeContentParamsSchema>;
export type ContentFilterOptions = z.infer<typeof contentFilterSchema>;
export type GetActiveContentQueryDto = z.infer<
  typeof getActiveContentQuerySchema
>;
export type ListContentAdminQueryDto = z.infer<
  typeof listContentAdminQuerySchema
>;
