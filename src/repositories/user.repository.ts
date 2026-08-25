import { MongoInitializer } from "@/init";
import {
  insertUserSchema,
  type CreateUserPayload,
  type User,
  type UserRepository as IUserRepository,
} from "@/models";
import type { UserId, UserIdentifier } from "@/types";
import { ObjectId } from "mongodb";

export class UserRepository implements IUserRepository {
  private get collection() {
    return MongoInitializer.getDb().collection<User>("customers");
  }

  async find(identifier: UserIdentifier): Promise<User | null> {
    const user = await this.collection.findOne(identifier);
    return user;
  }

  async create(userData: CreateUserPayload): Promise<User | null> {
    const parsedData = insertUserSchema.parse(userData);

    const result = await this.collection.insertOne(parsedData as User);
    if (!result.insertedId) return null;
    return this.collection.findOne({ _id: result.insertedId });
  }

  async update(identifier: UserId, updateData: Partial<User>): Promise<User | null> {
    const result = await this.collection.findOneAndUpdate(
      identifier,
      { $set: updateData },
      { returnDocument: "after" },
    );
    return result;
  }

  async delete(identifier: UserId): Promise<void> {
    await this.collection.deleteOne(identifier);
  }

  async incrementStickersCount(
    userId: ObjectId,
    type: "static" | "dynamic",
    amount: number = 1,
  ): Promise<void> {
    await this.collection.updateOne(
      { _id: userId },
      { $inc: { [`stickers_count.${type}`]: amount } },
    );
  }
}
