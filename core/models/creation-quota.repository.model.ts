import type { CreationQuota } from "./creation-quota.model";
import type { ObjectId } from "mongodb";

export interface CreationQuotaRepository {
  findByUserAndDate(
    userId: ObjectId,
    cycleDate: string,
  ): Promise<CreationQuota | null>;
  reservePack(
    userId: ObjectId,
    cycleDate: string,
    cycleStart: Date,
    packName: string,
  ): Promise<CreationQuota>;
  incrementStickers(
    userId: ObjectId,
    cycleDate: string,
    cycleStart: Date,
    packName: string,
    count: number,
  ): Promise<CreationQuota>;
}
