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
    const pack = await this.packRepository.findById(id);
    return pack;
  }

  async findByUserId(userId: ObjectId): Promise<StickerPack[]> {
    const packs = await this.packRepository.findByUserId(userId);
    return packs;
  }

  async update(
    id: ObjectId,
    userId: ObjectId,
    updateData: UpdatePackDto,
  ): Promise<StickerPack | null> {
    const pack = await this.packRepository.update(id, userId, updateData);
    return pack;
  }

  async delete(id: ObjectId, userId: ObjectId): Promise<boolean> {
    const result = await this.packRepository.delete(id, userId);
    return result;
  }
}