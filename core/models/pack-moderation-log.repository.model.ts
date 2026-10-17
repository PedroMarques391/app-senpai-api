import type {
  CreatePackModerationLogPayload,
  PackModerationLog,
} from "@/models";
import type { ObjectId } from "mongodb";

export interface PackModerationLogRepository {
  create(data: CreatePackModerationLogPayload): Promise<PackModerationLog>;
  findManyByPackId(packId: ObjectId): Promise<PackModerationLog[]>;
}
