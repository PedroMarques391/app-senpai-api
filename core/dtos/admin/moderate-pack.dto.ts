import {
  packModerationActionEnum,
  packModerationStatusEnum,
  reportReasonEnum,
} from "@/schemas";
import { z } from "zod";

export const moderatePackDtoSchema = z
  .preprocess(
    (val) => {
      if (
        val &&
        typeof val === "object" &&
        !("action" in val) &&
        "status" in val
      ) {
        const rawStatus = (val as Record<string, unknown>).status;
        if (rawStatus === "approved") {
          return { ...val, action: "APPROVE" };
        }
        if (rawStatus === "banned") {
          return { ...val, action: "BAN" };
        }
      }
      return val;
    },
    z
      .object({
        action: packModerationActionEnum,
        status: packModerationStatusEnum
          .extract(["approved", "banned"])
          .optional(),
        reason: reportReasonEnum.optional(),
        reset_reports: z.boolean().default(true),
        notes: z.string().trim().max(500).optional(),
      })
      .strict(),
  );

export const listPacksAdminQuerySchema = z.object({
  status: packModerationStatusEnum
    .exclude(["approved"], { message: "Filtro de status inválido." })
    .optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ModeratePackDto = z.infer<typeof moderatePackDtoSchema>;
export type ListPacksAdminQueryDto = z.infer<typeof listPacksAdminQuerySchema>;
