import type { CreateGroupDto, UpdateGroupDto } from "@/dtos";
import type { Group } from "./group.model";
import { ObjectId } from "mongodb";

export interface GroupRepository {
    create(data: CreateGroupDto): Promise<Group>;
    findAll(): Promise<Group[]>;
    findById(id: ObjectId): Promise<Group | null>;
    update(id: ObjectId, data: UpdateGroupDto): Promise<Group>;
    delete(id: ObjectId): Promise<void>;
}