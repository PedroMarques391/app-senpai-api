import { EMAIL_SENDERS, MODERATOR_EMAIL } from "@/constants";
import type {
  CreateGroupDto,
  GroupModerationRepositoryOptions,
  ListGroupsAdminQueryDto,
  ModerateGroupDto,
  UpdateGroupDto,
  UpdateGroupItemDto,
} from "@/dtos";
import {
  AppError,
  GroupAlreadyDecidedError,
  GroupItemNotFoundError,
  GroupLimitReachedError,
  GroupNotFoundError,
} from "@/errors";
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
import type { MailService } from "./mail.service";

export class GroupService {
  constructor(
    private readonly groupRepository: GroupRepository,
    private readonly mailService: MailService,
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
      throw new GroupNotFoundError("Parece que você ainda não cadastrou nenhum grupo");
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
      throw new GroupNotFoundError();
    }
    PermissionUtils.verifyOwnership(group.user_id, userObjectId, "grupo");
    return group;
  }

  async findManyGroupsForModeration(
    query: ListGroupsAdminQueryDto,
  ): Promise<PaginatedResult<GroupModerationItem>> {
    const { page, limit } = query;
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
        throw new GroupLimitReachedError();
      }

      const updatedGroups = [...existingGroups.groups, ...data.groups];
      const updated = await this.groupRepository.update(existingGroups._id, {
        groups: updatedGroups,
      });

      if (!updated) {
        throw new AppError("Não foi possível adicionar o novo grupo", 500, "GROUP_UPDATE_FAILED");
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
      throw new AppError("Não foi possível criar o grupo", 500, "GROUP_CREATE_FAILED");
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
      throw new GroupNotFoundError();
    }

    PermissionUtils.verifyOwnership(existing.user_id, userObjectId, "grupo");

    const updated = await this.groupRepository.update(groupObjectId, data);
    if (!updated) {
      throw new AppError("Falha ao atualizar grupo", 500, "GROUP_UPDATE_FAILED");
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
      throw new AppError("Nenhum dado informado para atualização", 400, "NO_DATA_PROVIDED");
    }

    const updatedGroup = await this.groupRepository.updateGroupItem(
      userObjectId,
      itemId,
      data,
    );

    if (!updatedGroup) {
      throw new GroupItemNotFoundError();
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
      throw new GroupItemNotFoundError();
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
      throw new GroupNotFoundError();
    }

    PermissionUtils.verifyOwnership(existing.user_id, userObjectId, "grupo");

    const deleted = await this.groupRepository.delete(groupObjectId);
    if (!deleted) {
      throw new AppError("Falha ao remover grupo", 500, "GROUP_DELETE_FAILED");
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
      to: MODERATOR_EMAIL,
      subject: `[Moderação] ${eventTitle}: ${groupNames}`,
      html,
    });
  }
}
