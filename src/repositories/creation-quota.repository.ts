import { MongoInitializer } from "@/init";
import {
  type CreationQuota,
  type CreationQuotaRepository as ICreationQuotaRepository,
} from "@/models";
import type { ObjectId } from "mongodb";

export class CreationQuotaRepository implements ICreationQuotaRepository {
  private get collection() {
    return MongoInitializer.getDb().collection<CreationQuota>("creationQuotas");
  }

  async findByUserAndDate(
    userId: ObjectId,
    cycleDate: string,
  ): Promise<CreationQuota | null> {
    return this.collection.findOne({ user_id: userId, cycle_date: cycleDate });
  }

  async reservePack(
    userId: ObjectId,
    cycleDate: string,
    cycleStart: Date,
    packName: string,
  ): Promise<CreationQuota> {
    const now = new Date();
    const result = await this.collection.findOneAndUpdate(
      { user_id: userId, cycle_date: cycleDate },
      {
        $setOnInsert: {
          user_id: userId,
          cycle_date: cycleDate,
          cycle_start: cycleStart,
          stickers_count: 0,
          created_at: now,
        },
        $set: {
          active_pack_name: packName,
          updated_at: now,
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    if (!result) {
      throw new Error("Falha ao reservar pack para cota diária");
    }

    return result;
  }

  async incrementStickers(
    userId: ObjectId,
    cycleDate: string,
    cycleStart: Date,
    packName: string | null,
    count: number,
  ): Promise<CreationQuota> {
    const now = new Date();
    const result = await this.collection.findOneAndUpdate(
      { user_id: userId, cycle_date: cycleDate },
      {
        $setOnInsert: {
          user_id: userId,
          cycle_date: cycleDate,
          cycle_start: cycleStart,
          active_pack_name: packName,
          created_at: now,
        },
        $inc: {
          stickers_count: count,
        },
        $set: {
          updated_at: now,
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    if (!result) {
      throw new Error("Falha ao atualizar cota de figurinhas");
    }

    return result;
  }
}
