import type { UserAdminFilterOptions } from "@/dtos";
import { MongoInitializer } from "@/init";
import {
  insertUserSchema,
  type CreateUserPayload,
  type UserRepository as IUserRepository,
  type User,
} from "@/models";
import type {
  PaginationOptions,
  RepositoryPaginatedResult,
  UserId,
  UserIdentifier,
} from "@/types";
import { ObjectId, type Filter } from "mongodb";

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

  async update(
    identifier: UserId,
    updateData: Partial<User>,
  ): Promise<User | null> {
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

  async findAll(
    filters: UserAdminFilterOptions,
    pagination: PaginationOptions,
  ): Promise<RepositoryPaginatedResult<User>> {
    const query: Filter<User> = {};

    if (filters.role) {
      query.role = filters.role;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: "i" } },
        { userName: { $regex: filters.search, $options: "i" } },
        { email: { $regex: filters.search, $options: "i" } },
      ];
    }

    const [data, total] = await Promise.all([
      this.collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit)
        .toArray(),
      this.collection.countDocuments(query),
    ]);

    return { data, total };
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

  async incrementPetals(
    userId: ObjectId,
    amount: number,
  ): Promise<User | null> {
    const result = await this.collection.findOneAndUpdate(
      { _id: userId },
      {
        $inc: { petals_balance: amount },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: "after" },
    );

    return result;
  }

  async deductPetals(userId: ObjectId, amount: number): Promise<number | null> {
    const result = await this.collection.findOneAndUpdate(
      { _id: userId, petals_balance: { $gte: amount } },
      {
        $inc: { petals_balance: -amount },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: "after" },
    );

    return result?.petals_balance ?? null;
  }
}
