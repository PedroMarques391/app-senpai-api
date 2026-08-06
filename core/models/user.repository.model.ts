import type { CreateUserDto, UpdateUserDto } from "core/dtos";
import type { User } from "./user.model";
import { ObjectId } from "mongodb";

export interface UserRepository {
  findByWAId(waId: string): Promise<User | null>;
  findByIdentifier(identifier: string): Promise<User | null>;
  update(id: string | ObjectId, updateData: UpdateUserDto): Promise<User | null>;
  create(userData: CreateUserDto): Promise<User | null>;
  delete(id: string | ObjectId): Promise<void>;
}
