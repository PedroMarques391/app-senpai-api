import {
  insertPackReportSchema,
  packReportSchema,
  reportReasonEnum,
  type ReportReason,
} from "@/schemas";
import { z } from "zod";

export { insertPackReportSchema, reportReasonEnum };
export type { ReportReason };
export type PackReport = z.infer<typeof packReportSchema>;
export type CreatePackReportPayload = z.input<typeof insertPackReportSchema>;
