import crypto from "node:crypto";
import type { CreateGroupDto, UpdateGroupDto, UpdateGroupItemDto } from "@/dtos";
import type { Group, GroupItem, GroupRepository } from "@/models";
import { MongoUtils, PermissionUtils } from "@/utils";
import { EMAIL_SENDERS } from "@/constants";
import {
  renderModerationGroupEmailTemplate,
  type ModerationGroupEmailItem,
} from "@/templates/email";
import type { MailService } from "./mail.service";
import type { CacheService } from "./cache.service";

export interface GroupModerationTokenPayload {
  groupId: string;
  itemId: string;
  action: "accepted" | "rejected";
  moderatorEmail: string;
  createdAt: number;
}

export class GroupService {
  constructor(
    private readonly groupRepository: GroupRepository,
    private readonly mailService: MailService,
    private readonly cacheService: CacheService,
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

      const addedGroups = updated.groups.slice(existingGroups.groups.length);
      await this.sendModerationEmail(
        existingGroups._id.toString(),
        email,
        userName,
        "Novo Grupo Cadastrado",
        "Um usuário cadastrou um novo grupo na plataforma. Analise e aprove ou rejeite o link abaixo.",
        addedGroups
      );

      return updated;
    }

    const group = await this.groupRepository.create(userObjectId, data);
    if (!group) {
      throw new Error("Não foi possível criar o grupo");
    }

    await this.sendModerationEmail(
      group._id.toString(),
      email,
      userName,
      "Novo Grupo Cadastrado",
      "Um usuário cadastrou um novo grupo na plataforma. Analise e aprove ou rejeite o link abaixo.",
      group.groups
    );

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
      await this.sendModerationEmail(
        updatedGroup._id.toString(),
        email,
        userName,
        "Grupo Atualizado",
        "As informações de um grupo existente foram atualizadas. Analise e aprove ou rejeite as alterações abaixo.",
        [updatedItem]
      );
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
      await this.sendModerationEmail(
        undefined,
        email,
        userName,
        "Grupo Removido",
        "Um grupo foi removido da plataforma pelo usuário. O link abaixo é mantido apenas como registro e referência histórica de auditoria.",
        [itemToDelete]
      );
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

  async moderateGroupItem(token: string): Promise<{ group: Group; item: GroupItem; action: string }> {
    const payload = await this.cacheService.get<GroupModerationTokenPayload>(`moderate:${token}`);
    if (!payload) {
      throw new Error("Link de moderação inválido ou já utilizado.");
    }

    const groupObjectId = MongoUtils.toObjectId(payload.groupId, "ID do grupo inválido");
    const updated = await this.groupRepository.updateGroupItemStatus(
      groupObjectId,
      payload.itemId,
      payload.action,
    );

    if (!updated) {
      throw new Error("Grupo ou item não encontrado para moderação.");
    }

    await this.cacheService.del(`moderate:${token}`);

    const updatedItem = updated.groups.find((i) => i.id === payload.itemId);
    if (!updatedItem) {
      throw new Error("Item do grupo não encontrado após atualização.");
    }

    return { group: updated, item: updatedItem, action: payload.action };
  }

  private async sendModerationEmail(
    groupId: string | undefined,
    userEmail: string,
    userName: string,
    eventTitle: string,
    eventDescription: string,
    items: GroupItem[]
  ) {
    const baseUrl =
      process.env.NODE_ENV === "production"
        ? process.env.PRODUCTION_URL
        : process.env.LOCAL_URL

    const ttl = 60 * 60 * 24 * 7;

    const emailGroups: ModerationGroupEmailItem[] = await Promise.all(
      items.map(async (item) => {
        let acceptUrl: string | undefined;
        let rejectUrl: string | undefined;

        if (groupId) {
          const acceptToken = crypto.randomBytes(20).toString("hex");
          const rejectToken = crypto.randomBytes(20).toString("hex");

          await this.cacheService.set<GroupModerationTokenPayload>(
            `moderate:${acceptToken}`,
            {
              groupId,
              itemId: item.id,
              action: "accepted",
              moderatorEmail: process.env.MODERATOR_EMAIL,
              createdAt: Date.now(),
            },
            ttl,
          );

          await this.cacheService.set<GroupModerationTokenPayload>(
            `moderate:${rejectToken}`,
            {
              groupId,
              itemId: item.id,
              action: "rejected",
              moderatorEmail: process.env.MODERATOR_EMAIL,
              createdAt: Date.now(),
            },
            ttl,
          );

          acceptUrl = `${baseUrl}/group/moderate?token=${acceptToken}`;
          rejectUrl = `${baseUrl}/group/moderate?token=${rejectToken}`;
        }

        return {
          id: item.id,
          title: item.title,
          url: item.url,
          status: item.status,
          acceptUrl,
          rejectUrl,
        };
      })
    );

    const html = renderModerationGroupEmailTemplate({
      eventTitle,
      eventDescription,
      userName,
      userEmail,
      groups: emailGroups,
    });

    this.mailService.sendMail({
      from: EMAIL_SENDERS.SECURITY,
      to: process.env.MODERATOR_EMAIL,
      subject: `[Moderação] ${eventTitle}`,
      html,
    });
  }
}
