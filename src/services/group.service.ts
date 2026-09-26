import type { CreateGroupDto, UpdateGroupDto } from "@/dtos";
import type { Group, GroupRepository } from "@/models";
import { MongoUtils, PermissionUtils } from "@/utils";

export class GroupService {
  constructor(private readonly groupRepository: GroupRepository) { }

  async findManyGroups(userId: string): Promise<Group> {
    const userObjectId = MongoUtils.toObjectId(userId, "ID do usuário inválido");
    return this.groupRepository.find(userObjectId);
  }

  async findGroupById(userId: string, id: string): Promise<Group> {
    const userObjectId = MongoUtils.toObjectId(userId, "ID do usuário inválido");
    const groupObjectId = MongoUtils.toObjectId(id, "ID do grupo inválido");
    const group = await this.groupRepository.findById(groupObjectId);
    if (!group) {
      throw new Error("Grupo não encontrado");
    }
    PermissionUtils.verifyOwnership(group.user_id, userObjectId, "grupo");
    return group;
  }


  async createGroup(userId: string, data: CreateGroupDto): Promise<Group> {
    const userObjectId = MongoUtils.toObjectId(userId, "ID do usuário inválido");

    const existingGroups = await this.groupRepository.find(userObjectId);
    if (existingGroups) {
      throw new Error("Usuário já possui grupos cadastrados",);
    }

    const group = await this.groupRepository.create(userObjectId, data);
    if (!group) {
      throw new Error("Não foi possível criar o grupo");
    }
    return group;
  }

  async updateGroup(
    userId: string,
    id: string,
    data: UpdateGroupDto,
  ): Promise<Group> {
    const userObjectId = MongoUtils.toObjectId(userId, "ID do usuário inválido");
    const groupObjectId = MongoUtils.toObjectId(id, "ID do grupo inválido");

    const existing = await this.groupRepository.findById(groupObjectId);
    if (!existing) {
      throw new Error("Grupo não encontrado");
    }

    PermissionUtils.verifyOwnership(existing.user_id, userObjectId, "grupo");

    const updated = await this.groupRepository.update(groupObjectId, data);
    if (!updated) {
      throw new Error("Falha ao atualizar grupo");
    }
    return updated;
  }

  async deleteGroup(userId: string, id: string): Promise<boolean> {
    const userObjectId = MongoUtils.toObjectId(userId, "ID do usuário inválido");
    const groupObjectId = MongoUtils.toObjectId(id, "ID do grupo inválido");

    const existing = await this.groupRepository.findById(groupObjectId);
    if (!existing) {
      throw new Error("Grupo não encontrado");
    }

    PermissionUtils.verifyOwnership(existing.user_id, userObjectId, "grupo");

    const deleted = await this.groupRepository.delete(groupObjectId);
    if (!deleted) {
      throw new Error("Falha ao remover grupo");
    }
    return deleted;
  }
}
