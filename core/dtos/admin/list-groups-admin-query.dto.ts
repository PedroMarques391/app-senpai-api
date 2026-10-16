import { groupItemStatusSchema } from "@/schemas";
import { z } from "zod";

export const groupModerationFilterSchema = z.object({
  status: groupItemStatusSchema.default("pending"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const listGroupsAdminQuerySchema = z.object({
  status: groupItemStatusSchema.default("pending"),
  order: z.enum(["asc", "desc"]).default("desc"),
  sort: z.enum(["recent", "oldest"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type GroupModerationRepositoryOptions = z.infer<
  typeof groupModerationFilterSchema
>;
export type ListGroupsAdminQueryDto = z.infer<
  typeof listGroupsAdminQuerySchema
>;
