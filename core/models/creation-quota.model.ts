import { creationQuotaSchema } from "@/schemas";
import { z } from "zod";

export type CreationQuota = z.infer<typeof creationQuotaSchema>;
