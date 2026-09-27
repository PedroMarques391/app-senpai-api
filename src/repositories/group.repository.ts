import { MongoInitializer } from "@/init";
import {
  insertGroupSchema,
  type Group,
  type GroupRepository as IGroupRepository,
} from "@/models";
import type {
  CreateGroupDto,
  UpdateGroupDto,
  UpdateGroupItemDto,
} from "@/dtos";
import type { ObjectId } from "mongodb";

export class GroupRepository implements IGroupRepository {
  private get collection() {
    return MongoInitializer.getDb().collection<Group>("groups");
  }

  async find(userId: ObjectId): Promise<Group | null> {
    return this.collection.findOne({ user_id: userId });
  }

  async findAll(): Promise<Group[]> {
    return this.collection.find().toArray();
  }

  async findById(id: ObjectId): Promise<Group | null> {
    return this.collection.findOne({ _id: id });
  }

  async create(userId: ObjectId, data: CreateGroupDto): Promise<Group | null> {
    const parsed = insertGroupSchema.parse({ user_id: userId, ...data });
    const result = await this.collection.insertOne(parsed as Group);
    if (!result.insertedId) {
      return null;
    }
    return this.collection.findOne({ _id: result.insertedId });
  }

  async update(id: ObjectId, data: UpdateGroupDto): Promise<Group | null> {
    const updated = await this.collection.findOneAndUpdate(
      { _id: id },
      { $set: { ...data, updated_at: new Date() } },
      { returnDocument: "after" },
    );

    return updated;
  }

  async updateGroupItem(
    userId: ObjectId,
    itemId: string,
    data: UpdateGroupItemDto,
  ): Promise<Group | null> {
    const setFields: Record<string, any> = {
      updated_at: new Date(),
    };

    if (data.title !== undefined) {
      setFields["groups.$.title"] = data.title;
    }
    if (data.url !== undefined) {
      setFields["groups.$.url"] = data.url;
    }

    const updated = await this.collection.findOneAndUpdate(
      {
        user_id: userId,
        "groups.id": itemId,
      },
      {
        $set: setFields,
      },
      { returnDocument: "after" },
    );

    return updated;
  }

  async deleteGroupItem(
    userId: ObjectId,
    itemId: string,
  ): Promise<Group | null> {
    const updated = await this.collection.findOneAndUpdate(
      {
        user_id: userId,
        "groups.id": itemId,
      },
      {
        $pull: {
          groups: { id: itemId },
        },
        $set: {
          updated_at: new Date(),
        },
      },
      { returnDocument: "after" },
    );

    if (updated && updated.groups.length === 0) {
      await this.collection.deleteOne({ _id: updated._id });
    }

    return updated;
  }

  async delete(id: ObjectId): Promise<boolean> {

    const result = await this.collection.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }
}
