import type {
  CreateGroupDto,
  GroupModerationRepositoryOptions,
  UpdateGroupDto,
  UpdateGroupItemDto,
} from "@/dtos";
import type {
  Group,
  GroupItem,
  GroupItemStatus,
  GroupModerationItem,
} from "./group.model";
import type { PaginationOptions, RepositoryPaginatedResult } from "@/types";
import type { ObjectId } from "mongodb";

export interface GroupRepository {
  create(userId: ObjectId, data: CreateGroupDto): Promise<Group | null>;
  find(userId: ObjectId): Promise<Group | null>;
  findAll(): Promise<Group[]>;
  findById(id: ObjectId): Promise<Group | null>;
  findManyForModeration(
    options: GroupModerationRepositoryOptions,
    paginationOptions: PaginationOptions,
  ): Promise<RepositoryPaginatedResult<GroupModerationItem>>;
  update(id: ObjectId, data: UpdateGroupDto): Promise<Group | null>;
  updateGroupItem(
    userId: ObjectId,
    itemId: string,
    data: UpdateGroupItemDto,
  ): Promise<Group | null>;
  updateGroupItemModeration(
    groupId: ObjectId,
    itemId: string,
    action: GroupItemStatus,
    moderatorUserId: ObjectId,
    moderatorUsername: string,
    note?: string,
  ): Promise<Group | null>;
  deleteGroupItem(userId: ObjectId, itemId: string): Promise<Group | null>;
  delete(id: ObjectId): Promise<boolean>;
}