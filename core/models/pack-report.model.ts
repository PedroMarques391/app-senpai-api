import { insertPackReportSchema, packReportSchema } from "@/schemas";
import { z } from "zod";

export { insertPackReportSchema };
export type PackReport = z.infer<typeof packReportSchema>;
export type CreatePackReportPayload = z.input<typeof insertPackReportSchema>;

