import type { CreatePackDto, UpdatePackDto } from "@/dtos";
import type { StickerPack } from "@/models";
import type { PackRepository } from "@/repositories";
import type { ObjectId } from "mongodb";

export class PackService {
  constructor(private readonly packRepository: PackRepository) { }

  async create(
    userId: ObjectId,
    publisher: string,
    packData: CreatePackDto,
  ): Promise<StickerPack | null> {
    if (!userId || !publisher) {
      throw new Error("Error to create pack, try again later");
    }
    const pack = await this.packRepository.create(userId, publisher, packData);
    return pack;
  }

  async findAll(): Promise<StickerPack[]> {
    const packs = await this.packRepository.findAll();
    return packs;
  }

  async findById(id: ObjectId): Promise<StickerPack | null> {
    if (!id) {
      throw new Error("Error to find pack, try again later");
    }
    const pack = await this.packRepository.findById(id);

    return pack;
  }

  async findByUserId(userId: ObjectId): Promise<StickerPack[]> {
    if (!userId) {
      throw new Error("Error to find pack, try again later");
    }
    const packs = await this.packRepository.findByUserId(userId);
    if (!packs) {
      return [];
    }
    return packs;
  }

  async update(
    id: ObjectId,
    userId: ObjectId,
    updateData: UpdatePackDto,
  ): Promise<StickerPack | null> {
    if (!id || !userId) {
      throw new Error("Invalid parameters to update pack");
    }

    const existingPack = await this.packRepository.findById(id);
    if (!existingPack) {
      throw new Error("Pack not found");
    }

    if (existingPack.user_id.toString() !== userId.toString()) {
      throw new Error("Operation not permitted: You do not own this pack");
    }

    const pack = await this.packRepository.update(id, userId, updateData);
    if (!pack) {
      throw new Error("Failed to update pack, try again later");
    }

    return pack;
  }

  async delete(id: ObjectId, userId: ObjectId): Promise<boolean> {
    if (!id || !userId) {
      throw new Error("Invalid parameters to delete pack");
    }

    const existingPack = await this.packRepository.findById(id);
    if (!existingPack) {
      throw new Error("Pack not found");
    }

    if (existingPack.user_id.toString() !== userId.toString()) {
      throw new Error("Operation not permitted: You do not own this pack");
    }

    const result = await this.packRepository.delete(id, userId);
    if (!result) {
      throw new Error("Failed to delete pack, try again later");
    }

    return result;
  }
}