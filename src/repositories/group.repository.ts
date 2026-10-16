import type {
  CreateGroupDto,
  GroupModerationRepositoryOptions,
  UpdateGroupDto,
  UpdateGroupItemDto,
} from "@/dtos";
import { MongoInitializer } from "@/init";
import {
  insertGroupSchema,
  type Group,
  type GroupItemStatus,
  type GroupModerationItem,
  type GroupRepository as IGroupRepository,
} from "@/models";
import type { PaginationOptions, RepositoryPaginatedResult } from "@/types";
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

  async findManyForModeration(
    options: GroupModerationRepositoryOptions,
    paginationOptions: PaginationOptions,
  ): Promise<RepositoryPaginatedResult<GroupModerationItem>> {
    const pipeline = [
      { $match: { "groups.status": options.status } },
      { $unwind: "$groups" },
      { $match: { "groups.status": options.status } },
      {
        $lookup: {
          from: "customers",
          localField: "user_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 0,
          groupId: { $toString: "$_id" },
          itemId: "$groups.id",
          title: "$groups.title",
          url: "$groups.url",
          status: "$groups.status",
          requestType: { $ifNull: ["$groups.requestType", "created"] },
          requestedAt: {
            $ifNull: [
              "$groups.requested_at",
              "$groups.updated_at",
              "$updated_at",
              "$created_at",
            ],
          },
          userId: { $toString: "$user_id" },
          userName: "$user.userName",
        },
      },
      {
        $sort: {
          requestedAt: options.order === "asc" ? 1 : -1,
          groupId: 1 as const,
          itemId: 1 as const,
        },
      },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $skip: (paginationOptions.page - 1) * paginationOptions.limit },
            { $limit: paginationOptions.limit },
          ],
        },
      },
    ];

    const results = await this.collection.aggregate(pipeline).toArray();

    const metadata = results[0]?.metadata?.[0];
    const total = metadata?.total ?? 0;
    const data = (results[0]?.data ?? []) as GroupModerationItem[];

    return {
      data,
      total,
    };
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
    if (data.title !== undefined || data.url !== undefined) {
      setFields["groups.$.status"] = "pending";
      setFields["groups.$.requestType"] = "updated";
      setFields["groups.$.requested_at"] = new Date();
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

  async updateGroupItemModeration(
    groupId: ObjectId,
    itemId: string,
    action: GroupItemStatus,
    moderatorUserId: ObjectId,
    moderatorUsername: string,
    note?: string,
  ): Promise<Group | null> {
    const updated = await this.collection.findOneAndUpdate(
      {
        _id: groupId,
        groups: {
          $elemMatch: {
            id: itemId,
            status: "pending",
          },
        },
      },
      {
        $set: {
          "groups.$.status": action,
          "groups.$.decided_at": new Date(),
          "groups.$.decided_by": moderatorUserId,
          "groups.$.decided_by_username": moderatorUsername,
          "groups.$.moderation_note": note ?? null,
          updated_at: new Date(),
        },
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
