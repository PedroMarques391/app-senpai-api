import type { CreateUserDto } from "@/dtos/user/create-user.dto";
import type { UpdateUserDto } from "@/dtos/user/update-user.dto";
import { MongoInitializer } from "@/init/database";
import type { User } from "@/models/user.model";
import type { UserRepository } from "@/models/user.repository.model";
import { userSchema } from "@/schemas";

export class UserRepo implements UserRepository {
  private get collection() {
    return MongoInitializer.getDb().collection<User>("customers");
  }

  async findByWAId(waId: string): Promise<User | null> {
    const user = await this.collection.findOne({ wa_id: waId });
    return user;
  }

  async create(userData: CreateUserDto): Promise<User | null> {
    const insertSchema = userSchema.omit({ _id: true });
    const parsedData = insertSchema.parse(userData);

    const result = await this.collection.insertOne(parsedData as User);
    if (!result.insertedId) return null;
    return this.collection.findOne({ _id: result.insertedId });
  }

  async update(waId: string, updateData: UpdateUserDto): Promise<User | null> {
    const result = await this.collection.findOneAndUpdate(
      { wa_id: waId },
      { $set: updateData },
      { returnDocument: "after" },
    );
    return result;
  }

  async delete(waId: string): Promise<void> {
    await this.collection.deleteOne({ wa_id: waId });
  }
}
