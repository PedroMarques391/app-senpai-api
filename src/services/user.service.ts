import {
  createUserDtoSchema,
  updateUserDtoSchema,
  type CreateUserDto,
  type UpdateUserDto,
} from "@/dtos";
import type { User, UserRepository } from "@/models";

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async findUserByWAId(waId: string): Promise<User | null> {
    const user = await this.userRepository.find({ wa_id: waId });
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  async createUser(userData: CreateUserDto): Promise<User | null> {
    const parsed = createUserDtoSchema.parse(userData);
    const user = await this.userRepository.find({ wa_id: parsed.wa_id });
    if (user) {
      throw new Error("User already exists");
    }

    return this.userRepository.create(parsed);
  }

  async updateUser(
    waId: string,
    updateData: UpdateUserDto,
  ): Promise<User | null> {
    const parsed = updateUserDtoSchema.parse(updateData);
    return this.userRepository.update({ wa_id: waId }, parsed);
  }

  async deleteUser(waId: string): Promise<void> {
    return this.userRepository.delete({ wa_id: waId });
  }
}
