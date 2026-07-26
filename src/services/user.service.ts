import type { CreateUserDto } from "@/dtos/user/create-user.dto";
import type { UpdateUserDto } from "@/dtos/user/update-user.dto";
import type { User } from "@/models/user.model";
import type { UserRepository } from "@/models/user.repository.model";

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async findByWAId(waId: string): Promise<User | null> {
    const user = await this.userRepository.findByWAId(waId);
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  async create(userData: CreateUserDto): Promise<User | null> {
    const user = await this.userRepository.findByWAId(userData.wa_id);
    if (user) {
      throw new Error("User already exists");
    }

    return this.userRepository.create(userData);
  }

  async update(waId: string, updateData: UpdateUserDto): Promise<User | null> {
    return this.userRepository.update(waId, updateData);
  }

  async delete(waId: string): Promise<void> {
    return this.userRepository.delete(waId);
  }
}
