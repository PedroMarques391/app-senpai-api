import { reportReasonEnum } from "@/schemas";
import { z } from "zod";

export const reportPackQuerySchema = z.object({
  id: z.string(),
});

export const reportPackBodySchema = z
  .object({
    reason: reportReasonEnum,
    description: z.string().max(300).optional(),
  })
  .strict();

export type ReportPackQueryDto = z.infer<typeof reportPackQuerySchema>;
export type ReportPackBodyDto = z.infer<typeof reportPackBodySchema>;
