import { CreateUserDto } from "../dtos/user/create-user.dto";
import { UpdateUserDto } from "../dtos/user/update-user.dto";
import { User } from "../models/user.model";

export interface UserRepository {
  findByWAId(waId: string): Promise<User | null>;
  update(waId: string, updateData: UpdateUserDto): Promise<User | null>;
  create(userData: CreateUserDto): Promise<User | null>;
  delete(waId: string): Promise<void>;
}
