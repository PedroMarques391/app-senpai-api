import { z } from "zod";

export const moderatePackDtoSchema = z
  .object({
    status: z.enum(["approved", "banned"], {
      message: "Status de moderação inválido.",
    }),
    reset_reports: z.boolean().default(true),
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

export const listPacksAdminQuerySchema = z.object({
  status: z
    .enum(["pending", "banned"], {
      message: "Filtro de status inválido.",
    })
    .optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ModeratePackDto = z.infer<typeof moderatePackDtoSchema>;
export type ListPacksAdminQueryDto = z.infer<typeof listPacksAdminQuerySchema>;
