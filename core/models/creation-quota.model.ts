import { creationQuotaSchema } from "@/schemas";
import { z } from "zod";

export const insertCreationQuotaSchema = creationQuotaSchema.omit({
  _id: true,
});

export type CreationQuota = z.infer<typeof creationQuotaSchema>;
export type CreateCreationQuotaPayload = z.input<
  typeof insertCreationQuotaSchema
>;
