import { EMAIL_SENDERS, MAX_STRIKES } from "@/constants";
import type {
  AdminAdjustPetalsDto,
  AdminUpdateUserRoleDto,
  AdminUpdateUserStatusDto,
  CreateUserDto,
  ListUsersAdminQueryDto,
  UpdateUserDto,
  UserAdminFilterOptions,
} from "@/dtos";
import type { User, UserRepository } from "@/models";
import {
  renderModerationOutcomeEmailTemplate,
  renderModerationOutcomeText,
} from "@/templates";
import type { PaginatedResult } from "@/types";
import { AuthUtils, MongoUtils, UserUtils } from "@/utils";
import type { MailService } from "./mail.service";

export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly mailService?: MailService,
  ) {}

  async findUserByWAId(rawWaId: string): Promise<User | null> {
    const variants = AuthUtils.getWaIdVariants(rawWaId);
    const user = await this.userRepository.find({ wa_id: { $in: variants } });
    if (!user) {
      throw new Error("Usuário não encontrado.");
    }
    return UserUtils.applyDefaults(user);
  }

  async createUser(userData: CreateUserDto): Promise<User | null> {
    const variants = AuthUtils.getWaIdVariants(userData.wa_id);
    const user = await this.userRepository.find({ wa_id: { $in: variants } });
    if (user) {
      throw new Error("Já existe uma conta cadastrada com este número.");
    }

    return this.userRepository.create({
      ...userData,
      wa_id: variants[0],
    });
  }

  async updateUser(
    rawWaId: string,
    updateData: UpdateUserDto,
  ): Promise<User | null> {
    const waId = AuthUtils.normalizeWaId(rawWaId);
    return this.userRepository.update({ wa_id: waId }, updateData);
  }

  async deleteUser(rawWaId: string): Promise<void> {
    const waId = AuthUtils.normalizeWaId(rawWaId);
    return this.userRepository.delete({ wa_id: waId });
  }

  async addPetals(userId: string, amount: number): Promise<User> {
    if (amount <= 0) {
      throw new Error("A quantidade de pétalas a adicionar deve ser positiva");
    }
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID de usuário inválido",
    );

    const updatedUser = await this.userRepository.incrementPetals(
      userObjectId,
      amount,
    );
    if (!updatedUser) {
      throw new Error("Usuário não encontrado");
    }
    return updatedUser;
  }

  async deductPetals(userId: string, amount: number): Promise<User> {
    if (amount <= 0) {
      throw new Error("A quantidade de pétalas a deduzir deve ser positiva");
    }
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID de usuário inválido",
    );

    const newBalance = await this.userRepository.deductPetals(
      userObjectId,
      amount,
    );
    if (newBalance === null) {
      throw new Error(
        "Saldo de pétalas insuficiente ou usuário não encontrado",
      );
    }

    const user = await this.userRepository.find({ _id: userObjectId });
    if (!user) {
      throw new Error("Usuário não encontrado");
    }
    return user;
  }

  async adjustPetals(userId: string, amount: number): Promise<User> {
    if (amount === 0) {
      throw new Error("O valor de ajuste não pode ser zero");
    }
    return amount > 0
      ? this.addPetals(userId, amount)
      : this.deductPetals(userId, Math.abs(amount));
  }

  async findManyUsers(
    query: ListUsersAdminQueryDto,
  ): Promise<PaginatedResult<User>> {
    const filters: UserAdminFilterOptions = {
      role: query.role,
      status: query.status,
      search: query.search,
    };

    const { data, total } = await this.userRepository.findAll(filters, {
      page: query.page,
      limit: query.limit,
    });

    return {
      data,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit) || 1,
    };
  }

  async findUserById(userId: string): Promise<User> {
    const objectId = MongoUtils.toObjectId(userId, "ID de usuário inválido");
    const user = await this.userRepository.find({ _id: objectId });
    if (!user) {
      throw new Error("Usuário não encontrado");
    }
    return UserUtils.applyDefaults(user);
  }

  async updateRole(
    adminId: string,
    userId: string,
    data: AdminUpdateUserRoleDto,
  ): Promise<User> {
    if (adminId === userId) {
      throw new Error(
        "Não é permitido alterar o próprio cargo de administrador",
      );
    }

    const objectId = MongoUtils.toObjectId(userId, "ID de usuário inválido");
    const user = await this.userRepository.find({ _id: objectId });
    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    const updated = await this.userRepository.update(
      { _id: objectId },
      { role: data.role, updatedAt: new Date() },
    );
    if (!updated) {
      throw new Error("Falha ao atualizar o cargo do usuário");
    }

    return updated;
  }

  async updateStatus(
    userId: string,
    data: AdminUpdateUserStatusDto,
  ): Promise<User> {
    const objectId = MongoUtils.toObjectId(userId, "ID de usuário inválido");
    const user = await this.userRepository.find({ _id: objectId });
    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    const updateFields: Partial<User> = {
      status: data.status,
      updatedAt: new Date(),
    };

    if (data.status === "active" && user.strikes >= MAX_STRIKES) {
      updateFields.strikes = 0;
    }

    const isBecomingRestricted =
      data.status === "restricted" && user.status !== "restricted";

    const updated = await this.userRepository.update(
      { _id: objectId },
      updateFields,
    );
    if (!updated) {
      throw new Error("Falha ao atualizar o status do usuário");
    }

    if (
      !isBecomingRestricted ||
      !this.mailService ||
      !updated.email ||
      !updated.isEmailVerified
    ) {
      return updated;
    }

    const emailProps = {
      eventType: "ACCOUNT_RESTRICTED" as const,
      userName: updated.name ?? "Criador",
      userHandle: updated.userName,
      currentStrikes: updated.strikes,
      maxStrikes: MAX_STRIKES,
    };

    const html = renderModerationOutcomeEmailTemplate(emailProps);
    const text = renderModerationOutcomeText(emailProps);

    await this.mailService.sendMail({
      from: EMAIL_SENDERS.SECURITY,
      to: updated.email,
      subject:
        "Aviso de Segurança: Seu perfil atingiu o limite de strikes e está temporariamente restrito",
      html,
      text,
    });

    return updated;
  }

  async adjustPetalsByAdmin(
    userId: string,
    data: AdminAdjustPetalsDto,
  ): Promise<User> {
    return this.adjustPetals(userId, data.amount);
  }
}
