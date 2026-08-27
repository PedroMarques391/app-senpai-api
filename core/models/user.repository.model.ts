import type { UserId, UserIdentifier } from "core/types";
import { ObjectId } from "mongodb";
import type { CreateUserPayload, User } from "./user.model";

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
  deductPetals(userId: ObjectId, amount: number): Promise<boolean>;
}
