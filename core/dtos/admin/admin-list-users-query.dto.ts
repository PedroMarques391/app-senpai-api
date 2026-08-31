import { userRoleEnum, userStatusEnum } from "@/schemas";
import { z } from "zod";

export const userAdminFilterSchema = z.object({
  role: userRoleEnum.optional(),
  status: userStatusEnum.optional(),
  search: z.string().optional(),
});

export const listUsersAdminQuerySchema = z.object({
  role: userRoleEnum.optional(),
  status: userStatusEnum.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type UserAdminFilterOptions = z.infer<typeof userAdminFilterSchema>;
export type ListUsersAdminQueryDto = z.infer<typeof listUsersAdminQuerySchema>;
