import type { CreateUserDto, UpdateUserDto } from "@/dtos";
import { MongoInitializer } from "@/init";
import type { User, UserRepository as IUserRepository } from "@/models";
import { userSchema } from "@/schemas";
import { ObjectId } from "mongodb";

export class UserRepository implements IUserRepository {
  private get collection() {
    return MongoInitializer.getDb().collection<User>("customers");
  }

  async findByWAId(waId: string): Promise<User | null> {
    const user = await this.collection.findOne({ wa_id: waId });
    return user;
  }

  async findByIdentifier(identifier: string): Promise<User | null> {
    const user = await this.collection.findOne({
      $or: [{ email: identifier }, { userName: identifier }],
    });
    return user;
  }

  async create(userData: CreateUserDto): Promise<User | null> {
    const insertSchema = userSchema.omit({ _id: true });
    const parsedData = insertSchema.parse(userData);

    const result = await this.collection.insertOne(parsedData as User);
    if (!result.insertedId) return null;
    return this.collection.findOne({ _id: result.insertedId });
  }

  async update(id: string | ObjectId, updateData: UpdateUserDto): Promise<User | null> {
    const query = id instanceof ObjectId ? { _id: id } : { wa_id: id };
    const result = await this.collection.findOneAndUpdate(
      query,
      { $set: updateData },
      { returnDocument: "after" },
    );
    return result;
  }

  async delete(id: string | ObjectId): Promise<void> {
    const query = id instanceof ObjectId ? { _id: id } : { wa_id: id };
    await this.collection.deleteOne(query);
  }
}
