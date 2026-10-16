import { ObjectId } from "mongodb";
import { z } from "zod";

export const reportReasonEnum = z.enum(
  [
    "child_exploitation",
    "adult_content",
    "violence_gore",
    "hate_speech",
    "harassment",
    "copyright",
    "spam_misleading",
    "other",
  ],
  { message: "Motivo de denúncia inválido." },
);

export type ReportReason = z.infer<typeof reportReasonEnum>;

export const packReportSchema = z.object({
  _id: z.instanceof(ObjectId),
  pack_id: z.instanceof(ObjectId),
  reporter_id: z.instanceof(ObjectId),
  reason: reportReasonEnum,
  description: z.string().max(300).optional(),
  created_at: z.coerce.date().default(() => new Date()),
});

export const insertPackReportSchema = packReportSchema.omit({ _id: true });
