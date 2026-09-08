import { ObjectId } from "mongodb";
import { z } from "zod";

export const creationQuotaSchema = z.object({
  _id: z.instanceof(ObjectId),
  user_id: z.instanceof(ObjectId),
  cycle_date: z.string(),
  cycle_start: z.coerce.date(),
  active_pack_name: z.string().nullable().default(null),
  stickers_count: z.number().int().nonnegative().default(0),
  created_at: z.coerce.date().default(() => new Date()),
  updated_at: z.coerce.date().default(() => new Date()),
});

export const reservePackDtoSchema = z.object({
  packName: z.string().min(1).max(50),
});

export const commitQuotaDtoSchema = z.object({
  packName: z.string().min(1).max(50),
  stickerCount: z.number().int().min(1),
  clientCycleStart: z.string().optional(),
});
export type ReservePackDto = z.infer<typeof reservePackDtoSchema>;
export type CommitQuotaDto = z.infer<typeof commitQuotaDtoSchema>;
