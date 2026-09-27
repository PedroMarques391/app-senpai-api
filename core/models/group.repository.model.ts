import type {
  CreateGroupDto,
  UpdateGroupDto,
  UpdateGroupItemDto,
} from "@/dtos";
import type { Group } from "./group.model";
import type { ObjectId } from "mongodb";

export interface GroupRepository {
    create(userId: ObjectId, data: CreateGroupDto): Promise<Group | null>;
    find(userId: ObjectId): Promise<Group | null>;
    findAll(): Promise<Group[]>;
    findById(id: ObjectId): Promise<Group | null>;
    update(id: ObjectId, data: UpdateGroupDto): Promise<Group | null>;
    updateGroupItem(
      userId: ObjectId,
      itemId: string,
      data: UpdateGroupItemDto,
    ): Promise<Group | null>;
    deleteGroupItem(userId: ObjectId, itemId: string): Promise<Group | null>;
    delete(id: ObjectId): Promise<boolean>;
}