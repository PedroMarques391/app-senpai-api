import type {
  CreateGroupDto,
  UpdateGroupDto,
  UpdateGroupItemDto,
} from "@/dtos";
import type { Group, GroupRepository } from "@/models";
import { MongoUtils, PermissionUtils } from "@/utils";

export class GroupService {
  constructor(private readonly groupRepository: GroupRepository) { }

  async findManyGroups(userId: string): Promise<Group | null> {
    const userObjectId = MongoUtils.toObjectId(userId, "ID do usuário inválido");
    const groups = await this.groupRepository.find(userObjectId);
    if (!groups) {
      throw new Error("Parece que você ainda não cadastrou nenhum grupo");
    }
    return groups;
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
      if (existingGroups.groups.length + data.groups.length > 2) {
        throw new Error("Você já atingiu o limite de 2 grupos");
      }

      const updatedGroups = [...existingGroups.groups, ...data.groups];
      const updated = await this.groupRepository.update(existingGroups._id, {
        groups: updatedGroups,
      });

      if (!updated) {
        throw new Error("Não foi possível adicionar o novo grupo");
      }

      return updated;
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

  async updateGroupItem(
    userId: string,
    itemId: string,
    data: UpdateGroupItemDto,
  ): Promise<Group> {
    const userObjectId = MongoUtils.toObjectId(userId, "ID do usuário inválido");

    if (data.title === undefined && data.url === undefined) {
      throw new Error("Nenhum dado informado para atualização");
    }

    const updatedGroup = await this.groupRepository.updateGroupItem(
      userObjectId,
      itemId,
      data,
    );

    if (!updatedGroup) {
      throw new Error("Item do grupo não encontrado");
    }

    return updatedGroup;
  }

  async deleteGroupItem(userId: string, itemId: string): Promise<Group> {
    const userObjectId = MongoUtils.toObjectId(userId, "ID do usuário inválido");

    const updatedGroup = await this.groupRepository.deleteGroupItem(
      userObjectId,
      itemId,
    );

    if (!updatedGroup) {
      throw new Error("Item do grupo não encontrado");
    }

    return updatedGroup;
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
