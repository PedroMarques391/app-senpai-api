import type { CreateGroupDto, UpdateGroupDto, UpdateGroupItemDto } from "@/dtos";
import type { Group, GroupRepository } from "@/models";
import { MongoUtils, PermissionUtils } from "@/utils";
import { EMAIL_SENDERS } from "@/constants";
import { renderModerationGroupEmailTemplate } from "@/templates/email";
import type { MailService } from "./mail.service";

export class GroupService {
  constructor(private readonly groupRepository: GroupRepository,
    private readonly mailService: MailService
  ) { }

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

  async createGroup(userId: string, email: string, userName: string, data: CreateGroupDto): Promise<Group> {
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

      this.sendModerationEmail(email, userName, "Novo Grupo Cadastrado", "Um usuário cadastrou um novo grupo na plataforma. O link abaixo já está disponível.", data.groups);

      return updated;
    }

    const group = await this.groupRepository.create(userObjectId, data);
    if (!group) {
      throw new Error("Não foi possível criar o grupo");
    }

    this.sendModerationEmail(email, userName, "Novo Grupo Cadastrado", "Um usuário cadastrou um novo grupo na plataforma. O link abaixo já está disponível.", data.groups);

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
    email: string,
    userName: string,
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

    const updatedItem = updatedGroup.groups.find((item) => item.id === itemId);
    if (updatedItem) {
      this.sendModerationEmail(email, userName, "Grupo Atualizado", "As informações de um grupo existente foram atualizadas. Verifique as alterações para garantir conformidade.", [updatedItem]);
    }

    return updatedGroup;
  }

  async deleteGroupItem(
    userId: string,
    email: string,
    userName: string,
    itemId: string
  ): Promise<Group> {
    const userObjectId = MongoUtils.toObjectId(userId, "ID do usuário inválido");

    const existingGroup = await this.groupRepository.find(userObjectId);
    const itemToDelete = existingGroup?.groups.find((i) => i.id === itemId);

    const updatedGroup = await this.groupRepository.deleteGroupItem(
      userObjectId,
      itemId,
    );

    if (!updatedGroup) {
      throw new Error("Item do grupo não encontrado");
    }

    if (itemToDelete) {
      this.sendModerationEmail(email, userName, "Grupo Removido", "Um grupo foi removido da plataforma pelo usuário. O link abaixo é mantido apenas como registro e referência histórica de auditoria.", [itemToDelete]);
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

  private sendModerationEmail(
    userEmail: string,
    userName: string,
    eventTitle: string,
    eventDescription: string,
    items: { title: string; url: string }[]
  ) {
    for (const item of items) {
      const html = renderModerationGroupEmailTemplate({
        eventTitle,
        eventDescription,
        userName,
        userEmail,
        groupTitle: item.title,
        groupUrl: item.url,
      });

      this.mailService.sendMail({
        from: EMAIL_SENDERS.SECURITY,
        to: process.env.MODERATOR_EMAIL,
        subject: `[Moderação] ${eventTitle}`,
        html,
      })
    }
  }
}
