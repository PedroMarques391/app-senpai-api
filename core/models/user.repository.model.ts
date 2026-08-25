import type { UserId, UserIdentifier } from "core/types";
import type { CreateUserPayload, User } from "./user.model";
import { ObjectId } from "mongodb";

export interface UserRepository {
  find(identifier: UserIdentifier): Promise<User | null>;
  update(identifier: UserId, updateData: Partial<User>): Promise<User | null>;
  create(userData: CreateUserPayload): Promise<User | null>;
  delete(identifier: UserId): Promise<void>;
  incrementStickersCount(
    userId: ObjectId,
    type: "static" | "dynamic",
    amount?: number,
  ): Promise<void>;
}
