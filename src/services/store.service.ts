import {
  createStoreItemDtoSchema,
  updateStoreItemDtoSchema,
  type CreateStoreItemDto,
  type UpdateStoreItemDto,
} from "@/dtos";
import type { StoreItem, StoreRepository } from "@/models";
import { MongoUtils } from "@/utils";

export class StoreService {
  constructor(private readonly repository: StoreRepository) {}

  async listItems(): Promise<StoreItem[]> {
    return this.repository.findAll();
  }

  async getItem(id: string): Promise<StoreItem> {
    const storeObjectId = MongoUtils.toObjectId(
      id,
      "ID do item da loja inválido",
    );
    const item = await this.repository.findById(storeObjectId);
    if (!item) throw new Error("Item da loja não encontrado");
    return item;
  }

  async createItem(data: CreateStoreItemDto): Promise<StoreItem> {
    const parsed = createStoreItemDtoSchema.parse(data);
    return this.repository.create(parsed);
  }

  async updateItem(id: string, data: UpdateStoreItemDto): Promise<StoreItem> {
    const storeObjectId = MongoUtils.toObjectId(
      id,
      "ID do item da loja inválido",
    );
    const parsed = updateStoreItemDtoSchema.parse(data);
    const updated = await this.repository.update(storeObjectId, parsed);
    if (!updated) throw new Error("Item da loja não encontrado");
    return updated;
  }

  async deleteItem(id: string): Promise<void> {
    const storeObjectId = MongoUtils.toObjectId(
      id,
      "ID do item da loja inválido",
    );
    await this.repository.delete(storeObjectId);
  }
}
