import { packCategoryEnum } from "@/schemas";
import { z } from "zod";

export const packFilterSchema = z.object({
  category: packCategoryEnum.optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
  sort: z.enum(["recent", "popular", "downloads", "likes"]).optional().default("recent"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const listPackQuerySchema = z.object({
  user: z.string().optional(),
  search: z.string().optional(),
  tags: z
    .union([z.string(), z.array(z.string())])
    .transform((value) => (typeof value === "string" ? [value] : value))
    .optional(),
  category: packCategoryEnum.optional(),
  sort: z.enum(["recent", "popular", "downloads", "likes"]).optional().default("recent"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type PackRepositoryOptions = z.infer<typeof packFilterSchema>;
export type ListPackQueryDto = z.infer<typeof listPackQuerySchema>;
