import type { CreateStoreItemDto, UpdateStoreItemDto } from "@/dtos";
import type { StoreItem, StoreItemStatus, StoreRepository } from "@/models";
import { MongoUtils } from "@/utils";

export class StoreService {
  constructor(private readonly storeRepository: StoreRepository) {}

  async findManyStoreItems(status?: StoreItemStatus): Promise<StoreItem[]> {
    return this.storeRepository.findAll(status);
  }

  async findStoreItemById(id: string): Promise<StoreItem> {
    const storeObjectId = MongoUtils.toObjectId(
      id,
      "ID do item da loja inválido",
    );
    const item = await this.storeRepository.findById(storeObjectId);
    if (!item) throw new Error("Item da loja não encontrado");
    return item;
  }

  async createStoreItem(dto: CreateStoreItemDto): Promise<StoreItem> {
    return this.storeRepository.create(dto);
  }

  async updateStoreItem(
    id: string,
    dto: UpdateStoreItemDto,
  ): Promise<StoreItem> {
    const storeObjectId = MongoUtils.toObjectId(
      id,
      "ID do item da loja inválido",
    );

    const existing = await this.storeRepository.findById(storeObjectId);
    if (!existing) throw new Error("Item da loja não encontrado");

    const updated = await this.storeRepository.update(storeObjectId, dto);
    if (!updated) throw new Error("Falha ao atualizar item da loja");
    return updated;
  }

  async deleteStoreItem(id: string): Promise<boolean> {
    const storeObjectId = MongoUtils.toObjectId(
      id,
      "ID do item da loja inválido",
    );

    const existing = await this.storeRepository.findById(storeObjectId);
    if (!existing) throw new Error("Item da loja não encontrado");

    return this.storeRepository.delete(storeObjectId);
  }
}
