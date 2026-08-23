import type { CreateUserDto, UpdateUserDto } from "core/dtos";
import type { UserId, UserIdentifier } from "core/types";
import type { User } from "./user.model";
import { ObjectId } from "mongodb";

export interface UserRepository {
  find(identifier: UserIdentifier): Promise<User | null>;
  update(identifier: UserId, updateData: UpdateUserDto): Promise<User | null>;
  create(userData: CreateUserDto): Promise<User | null>;
  delete(identifier: UserId): Promise<void>;
  incrementStickersCount(
    userId: ObjectId,
    type: "static" | "dynamic",
    amount?: number,
  ): Promise<void>;
}
