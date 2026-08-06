import type { CreatePackDto, UpdatePackDto } from "@/dtos";
import type { PackRepository as IPackRepository, StickerPack } from "@/models";
import type { ObjectId } from "mongodb";

export class PackRepository implements IPackRepository {
  async findAll(): Promise<StickerPack[]> {
    throw new Error("Method not implemented.");
  }

  async findById(id: ObjectId): Promise<StickerPack | null> {
    throw new Error("Method not implemented.");
  }

  async findByUserId(userId: ObjectId): Promise<StickerPack[]> {
    throw new Error("Method not implemented.");
  }

  async create(packData: CreatePackDto): Promise<StickerPack | null> {
    throw new Error("Method not implemented.");
  }

  async update(
    id: ObjectId,
    userId: ObjectId,
    updateData: UpdatePackDto,
  ): Promise<StickerPack | null> {
    throw new Error("Method not implemented.");
  }

  async delete(id: ObjectId, userId: ObjectId): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
}
