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
import type { PaginatedResult } from "@/types";
import { MongoUtils } from "@/utils";

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async findUserByWAId(waId: string): Promise<User | null> {
    const user = await this.userRepository.find({ wa_id: waId });
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  async createUser(userData: CreateUserDto): Promise<User | null> {
    const user = await this.userRepository.find({ wa_id: userData.wa_id });
    if (user) {
      throw new Error("User already exists");
    }

    return this.userRepository.create(userData);
  }

  async updateUser(
    waId: string,
    updateData: UpdateUserDto,
  ): Promise<User | null> {
    return this.userRepository.update({ wa_id: waId }, updateData);
  }

  async deleteUser(waId: string): Promise<void> {
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

    const deducted = await this.userRepository.deductPetals(
      userObjectId,
      amount,
    );
    if (!deducted) {
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

  async listAll(query: ListUsersAdminQueryDto): Promise<PaginatedResult<User>> {
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

  async findById(userId: string): Promise<User> {
    const objectId = MongoUtils.toObjectId(userId, "ID de usuário inválido");
    const user = await this.userRepository.find({ _id: objectId });
    if (!user) {
      throw new Error("Usuário não encontrado");
    }
    return user;
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

    const updated = await this.userRepository.update(
      { _id: objectId },
      { status: data.status, updatedAt: new Date() },
    );
    if (!updated) {
      throw new Error("Falha ao atualizar o status do usuário");
    }

    return updated;
  }

  async adjustPetalsByAdmin(
    userId: string,
    data: AdminAdjustPetalsDto,
  ): Promise<User> {
    return this.adjustPetals(userId, data.amount);
  }
}
