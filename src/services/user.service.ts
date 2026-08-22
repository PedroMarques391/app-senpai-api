import type { CreateUserDto, UpdateUserDto } from "@/dtos";
import type { User, UserRepository } from "@/models";

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async findByWAId(waId: string): Promise<User | null> {
    const user = await this.userRepository.find({ wa_id: waId });
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  async create(userData: CreateUserDto): Promise<User | null> {
    const user = await this.userRepository.find({ wa_id: userData.wa_id });
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
