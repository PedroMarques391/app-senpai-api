import type { CreateGroupDto, UpdateGroupDto } from "@/dtos";
import type { Group } from "./group.model";
import { ObjectId } from "mongodb";

export interface GroupRepository {
    create(userId: ObjectId, data: CreateGroupDto): Promise<Group | null>;
    find(userId: ObjectId): Promise<Group>;
    findAll(): Promise<Group[]>;
    findById(id: ObjectId): Promise<Group | null>;
    update(id: ObjectId, data: UpdateGroupDto): Promise<Group | null>;
    delete(id: ObjectId): Promise<boolean>;
}