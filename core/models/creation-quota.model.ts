import { creationQuotaSchema } from "@/schemas";
import { z } from "zod";

export type CreationQuota = z.infer<typeof creationQuotaSchema>;

export interface QuotaSnapshotDto {
  cycleStart: string;
  packName: string | null;
  createdStickerCount: number;
  isUnlimited: boolean;
}
