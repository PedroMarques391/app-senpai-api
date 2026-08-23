import type { CreateUserDto, UpdateUserDto } from "core/dtos";
import type { User } from "./user.model";
import { ObjectId } from "mongodb";

export type UserIdentifier =
  | { _id: ObjectId }
  | { wa_id: string }
  | { email: string }
  | { userName: string };

export interface UserRepository {
  find(identifier: UserIdentifier): Promise<User | null>;
  update(id: string | ObjectId, updateData: UpdateUserDto): Promise<User | null>;
  create(userData: CreateUserDto): Promise<User | null>;
  delete(id: string | ObjectId): Promise<void>;
  incrementStickersCount(
    userId: ObjectId,
    type: "static" | "dynamic",
    amount?: number,
  ): Promise<void>;
}
