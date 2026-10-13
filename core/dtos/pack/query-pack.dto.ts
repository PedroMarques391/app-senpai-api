import { packCategoryEnum, packModerationStatusEnum } from "@/schemas";
import { z } from "zod";

export const packFilterSchema = z.object({
  category: packCategoryEnum.optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
  sort: z.enum(["recent", "popular", "downloads", "likes"]).optional().default("recent"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
  min_stickers: z.coerce.number().int().min(1).max(30).optional(),
  max_stickers: z.coerce.number().int().min(1).max(30).optional(),
  is_public: z.boolean().optional(),
  moderation_status: z
    .union([packModerationStatusEnum, z.array(packModerationStatusEnum)])
    .optional(),
});


export const listPackQuerySchema = z
  .object({
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
    min_stickers: z.coerce.number().int().min(1).max(30).optional(),
    max_stickers: z.coerce.number().int().min(1).max(30).optional(),
  })
  .refine(
    (data) => {
      if (data.min_stickers !== undefined && data.max_stickers !== undefined) {
        return data.min_stickers <= data.max_stickers;
      }
      return true;
    },
    {
      message: "min_stickers deve ser menor ou igual a max_stickers",
      path: ["min_stickers"],
    },
  );

export type PackRepositoryOptions = z.infer<typeof packFilterSchema>;
export type ListPackQueryDto = z.infer<typeof listPackQuerySchema>;

