import type { CreatePackDto, UpdatePackDto } from "@/dtos";
import type { StickerPack } from "@/models";
import type { PackRepository } from "@/repositories";
import { MongoUtils, PermissionUtils } from "@/utils";

export class PackService {
  constructor(private readonly packRepository: PackRepository) {}

  async create(
    userId: string,
    publisher: string,
    packData: CreatePackDto,
  ): Promise<StickerPack | null> {
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID de usuário inválido",
    );

    if (!publisher) {
      throw new Error("Publisher not provided");
    }

    const pack = await this.packRepository.create({
      ...packData,
      user_id: userObjectId,
      publisher,
    });
    if (!pack) {
      throw new Error("Error to create pack, try again later");
    }
    return pack;
  }

  async findAll(): Promise<StickerPack[]> {
    const packs = await this.packRepository.findAll();
    return packs;
  }

  async findById(id: string): Promise<StickerPack | null> {
    const packObjectId = MongoUtils.toObjectId(id, "ID do pacote inválido");
    const pack = await this.packRepository.findById(packObjectId);
    return pack;
  }

  async findByUserId(userId: string, currentUserId: string): Promise<StickerPack[]> {
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID de usuário inválido",
    );
    const currentUserIdObject = MongoUtils.toObjectId(
      currentUserId,
      "ID de usuário inválido",
    );

    const packs = await this.packRepository.findByUserId(userObjectId);
    if (packs.length === 0) {
      return [];
    }

    PermissionUtils.verifyOwnership(currentUserIdObject, userObjectId, "pacotes do usuário");

    return packs;
  }

  async update(
    id: string,
    userId: string,
    updateData: UpdatePackDto,
  ): Promise<StickerPack | null> {
    const packObjectId = MongoUtils.toObjectId(id, "ID do pacote inválido");
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID de usuário inválido",
    );

    const existingPack = await this.packRepository.findById(packObjectId);
    if (!existingPack) {
      throw new Error("Pacote não encontrado");
    }

    PermissionUtils.verifyOwnership(existingPack.user_id, userObjectId, "pacote");

    const pack = await this.packRepository.update(
      packObjectId,
      userObjectId,
      updateData,
    );
    if (!pack) {
      throw new Error("Failed to update pack, try again later");
    }

    return pack;
  }

  async delete(
    id: string,
    userId: string,
  ): Promise<boolean> {
    const packObjectId = MongoUtils.toObjectId(id, "ID do pacote inválido");
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID de usuário inválido",
    );

    const existingPack = await this.packRepository.findById(packObjectId);
    if (!existingPack) {
      throw new Error("Pacote não encontrado");
    }

    PermissionUtils.verifyOwnership(existingPack.user_id, userObjectId, "pacote");

    const result = await this.packRepository.delete(
      packObjectId,
      userObjectId,
    );
    if (!result) {
      throw new Error("Failed to delete pack, try again later");
    }

    return result;
  }
}