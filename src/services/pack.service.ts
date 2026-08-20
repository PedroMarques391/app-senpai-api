import type { CreatePackDto, UpdatePackDto } from "@/dtos";
import type { StickerPack } from "@/models";
import type { PackRepository } from "@/repositories";
import { MongoUtils, PermissionUtils } from "@/utils";
import type { ObjectId } from "mongodb";

export class PackService {
  constructor(private readonly packRepository: PackRepository) {}

  async create(
    userId: string | ObjectId,
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

    const pack = await this.packRepository.create(
      userObjectId,
      publisher,
      packData,
    );
    if (!pack) {
      throw new Error("Error to create pack, try again later");
    }
    return pack;
  }

  async findAll(): Promise<StickerPack[]> {
    const packs = await this.packRepository.findAll();
    return packs;
  }

  async findById(id: string | ObjectId): Promise<StickerPack | null> {
    const packObjectId = MongoUtils.toObjectId(id, "ID do pacote inválido");
    const pack = await this.packRepository.findById(packObjectId);
    return pack;
  }

  async findByUserId(userId: string | ObjectId): Promise<StickerPack[]> {
    const userObjectId = MongoUtils.toObjectId(
      userId,
      "ID de usuário inválido",
    );
    const packs = await this.packRepository.findByUserId(userObjectId);
    if (!packs) {
      return [];
    }
    return packs;
  }

  async update(
    id: string | ObjectId,
    userId: string | ObjectId,
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
    id: string | ObjectId,
    userId: string | ObjectId,
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