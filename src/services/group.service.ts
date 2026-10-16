import { EMAIL_SENDERS } from "@/constants";
import type {
  CreateGroupDto,
  GroupModerationRepositoryOptions,
  ListGroupsAdminQueryDto,
  ModerateGroupDto,
  UpdateGroupDto,
  UpdateGroupItemDto,
} from "@/dtos";
import { GroupAlreadyDecidedError, GroupItemNotFoundError } from "@/errors";
import type {
  Group,
  GroupItem,
  GroupModerationItem,
  GroupRepository,
  UserRepository,
} from "@/models";
import {
  renderGroupModerationOutcomeEmailTemplate,
  renderModerationGroupEmailTemplate,
  type ModerationGroupEmailItem,
} from "@/templates/email";
import type { PaginatedResult, PaginationOptions } from "@/types";
import { MongoUtils, PermissionUtils } from "@/utils";
import type { CacheService } from "./cache.service";
import type { MailService } from "./mail.service";

export class GroupService {
  constructor(
    private readonly groupRepository: GroupRepository,
    private readonly mailService: MailService,
    private readonly cacheService: CacheService,
    private readonly userRepository?: UserRepository,
  ) {}

  async findManyGroups(
    userId: string,
    subscriptionType?: string,
  ): Promise<Group | null> {
    PermissionUtils.verifyMasterSubscription(subscriptionType);
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID do usuário inválido",
    );
    const groups = await this.groupRepository.find(userObjectId);
    if (!groups) {
      throw new Error("Parece que você ainda não cadastrou nenhum grupo");
    }
    return groups;
  }

  async findGroupById(
    userId: string,
    id: string,
    subscriptionType?: string,
  ): Promise<Group> {
    PermissionUtils.verifyMasterSubscription(subscriptionType);
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID do usuário inválido",
    );
    const groupObjectId = MongoUtils.toObjectId(id, "ID do grupo inválido");
    const group = await this.groupRepository.findById(groupObjectId);
    if (!group) {
      throw new Error("Grupo não encontrado");
    }
    PermissionUtils.verifyOwnership(group.user_id, userObjectId, "grupo");
    return group;
  }

  async findManyGroupsForModeration(
    query: ListGroupsAdminQueryDto,
  ): Promise<PaginatedResult<GroupModerationItem>> {
    const page = query.page > 0 ? query.page : 1;
    const limit = query.limit > 0 ? Math.min(query.limit, 50) : 20;

    const paginationOptions: PaginationOptions = { page, limit };

    const queryOptions: GroupModerationRepositoryOptions = {
      status: query.status,
      order: query.order,
    };

    const { data, total } = await this.groupRepository.findManyForModeration(
      queryOptions,
      paginationOptions,
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async moderateGroupItem(
    groupId: string,
    itemId: string,
    data: ModerateGroupDto,
    moderatorUser: { _id: string; userName: string },
  ): Promise<{ group: Group; item: GroupItem }> {
    const groupObjectId = MongoUtils.toObjectId(
      groupId,
      "ID do grupo inválido",
    );
    const moderatorObjectId = MongoUtils.toObjectId(
      moderatorUser._id,
      "ID do moderador inválido",
    );

    const updatedGroup = await this.groupRepository.updateGroupItemModeration(
      groupObjectId,
      itemId,
      data.action,
      moderatorObjectId,
      moderatorUser.userName,
      data.note,
    );

    if (!updatedGroup) {
      const existing = await this.groupRepository.findById(groupObjectId);
      if (!existing) {
        throw new GroupItemNotFoundError();
      }

      const existingItem = existing.groups.find((g) => g.id === itemId);
      if (!existingItem) {
        throw new GroupItemNotFoundError();
      }

      if (existingItem.status !== "pending") {
        throw new GroupAlreadyDecidedError();
      }

      throw new GroupItemNotFoundError();
    }

    const item = updatedGroup.groups.find((g) => g.id === itemId);
    if (!item) {
      throw new GroupItemNotFoundError();
    }

    await this.sendOutcomeEmailToOwner(
      updatedGroup,
      item,
      data.action,
      data.note,
    );

    return { group: updatedGroup, item };
  }

  async createGroup(
    userId: string,
    email: string,
    userName: string,
    data: CreateGroupDto,
    subscriptionType?: string,
  ): Promise<Group> {
    PermissionUtils.verifyMasterSubscription(subscriptionType);
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID do usuário inválido",
    );

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
        email,
        userName,
        "Novo Grupo Cadastrado",
        "Um usuário cadastrou um novo grupo na plataforma. A análise e decisão devem ser feitas no aplicativo.",
        addedGroups,
      );

      return updated;
    }

    const group = await this.groupRepository.create(userObjectId, data);
    if (!group) {
      throw new Error("Não foi possível criar o grupo");
    }

    await this.sendModerationEmail(
      email,
      userName,
      "Novo Grupo Cadastrado",
      "Um usuário cadastrou um novo grupo na plataforma. A análise e decisão devem ser feitas no aplicativo.",
      group.groups,
    );

    return group;
  }

  async updateGroup(
    userId: string,
    id: string,
    data: UpdateGroupDto,
    subscriptionType?: string,
  ): Promise<Group> {
    PermissionUtils.verifyMasterSubscription(subscriptionType);
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID do usuário inválido",
    );
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
    subscriptionType?: string,
  ): Promise<Group> {
    PermissionUtils.verifyMasterSubscription(subscriptionType);
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID do usuário inválido",
    );

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
        email,
        userName,
        "Grupo Atualizado",
        "As informações de um grupo existente foram atualizadas. A análise e decisão devem ser feitas no aplicativo.",
        [updatedItem],
      );
    }

    return updatedGroup;
  }

  async deleteGroupItem(
    userId: string,
    email: string,
    userName: string,
    itemId: string,
    subscriptionType?: string,
  ): Promise<Group> {
    PermissionUtils.verifyMasterSubscription(subscriptionType);
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID do usuário inválido",
    );

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
        email,
        userName,
        "Grupo Removido",
        "Um grupo foi removido da plataforma pelo usuário. Este aviso é mantido apenas como registro histórico de auditoria.",
        [itemToDelete],
      );
    }

    return updatedGroup;
  }

  async deleteGroup(
    userId: string,
    id: string,
    subscriptionType?: string,
  ): Promise<boolean> {
    PermissionUtils.verifyMasterSubscription(subscriptionType);
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID do usuário inválido",
    );
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

  private async sendOutcomeEmailToOwner(
    group: Group,
    item: GroupItem,
    action: "accepted" | "rejected",
    note?: string,
  ): Promise<void> {
    if (!this.userRepository) return;

    const owner = await this.userRepository.find({ _id: group.user_id });
    if (!owner || !owner.email || !owner.isEmailVerified) {
      return;
    }

    const html = renderGroupModerationOutcomeEmailTemplate({
      userName: owner.name || owner.userName || "Membro",
      groupTitle: item.title,
      action,
      note,
    });

    const isApproved = action === "accepted";
    const subject = isApproved
      ? `[Senpai] Seu grupo "${item.title}" foi aprovado!`
      : `[Senpai] Atualização sobre seu grupo "${item.title}"`;

    await this.mailService.sendMail({
      from: EMAIL_SENDERS.SECURITY,
      to: owner.email,
      subject,
      html,
    });
  }

  private async sendModerationEmail(
    userEmail: string,
    userName: string,
    eventTitle: string,
    eventDescription: string,
    items: GroupItem[],
  ) {
    const emailGroups: ModerationGroupEmailItem[] = items.map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      requestType: item.requestType,
    }));

    const html = renderModerationGroupEmailTemplate({
      eventTitle,
      eventDescription,
      userName,
      userEmail,
      groups: emailGroups,
    });

    const groupNames = items.map((i) => i.title).join(", ");
    this.mailService.sendMail({
      from: EMAIL_SENDERS.SECURITY,
      to: process.env.MODERATOR_EMAIL,
      subject: `[Moderação] ${eventTitle}: ${groupNames}`,
      html,
    });
  }
}
