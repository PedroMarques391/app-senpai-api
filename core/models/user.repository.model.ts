import type { UserAdminFilterOptions } from "@/dtos";
import type {
  PaginationOptions,
  RepositoryPaginatedResult,
  UserId,
  UserIdentifier,
} from "@/types";
import { ObjectId } from "mongodb";
import type { CreateUserPayload, User } from "./user.model";

export interface UserRepository {
  find(identifier: UserIdentifier): Promise<User | null>;
  update(identifier: UserId, updateData: Partial<User>): Promise<User | null>;
  create(userData: CreateUserPayload): Promise<User | null>;
  delete(identifier: UserId): Promise<void>;
  findAll(
    filters: UserAdminFilterOptions,
    pagination: PaginationOptions,
  ): Promise<RepositoryPaginatedResult<User>>;
  incrementStickersCount(
    userId: ObjectId,
    type: "static" | "dynamic",
    amount?: number,
  ): Promise<void>;
  incrementPetals(userId: ObjectId, amount: number): Promise<User | null>;
  deductPetals(userId: ObjectId, amount: number): Promise<boolean>;
}
