import { MongoInitializer } from "@/init";
import {
  insertPackModerationLogSchema,
  type CreatePackModerationLogPayload,
  type PackModerationLog,
  type PackModerationLogRepository as IPackModerationLogRepository,
} from "@/models";
import type { ObjectId } from "mongodb";

export class PackModerationLogRepository
  implements IPackModerationLogRepository
{
  private get collection() {
    return MongoInitializer.getDb().collection<PackModerationLog>(
      "pack_moderation_logs",
    );
  }

  async create(
    data: CreatePackModerationLogPayload,
  ): Promise<PackModerationLog> {
    const parsedData = insertPackModerationLogSchema.parse(data);
    const result = await this.collection.insertOne(
      parsedData as PackModerationLog,
    );
    return { ...parsedData, _id: result.insertedId } as PackModerationLog;
  }

  async findManyByPackId(packId: ObjectId): Promise<PackModerationLog[]> {
    return this.collection
      .find({ pack_id: packId })
      .sort({ created_at: -1 })
      .toArray();
  }
}
