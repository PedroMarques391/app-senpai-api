import type { CreateStoreItemDto, UpdateStoreItemDto } from "@/dtos";
import type { StoreItem, StoreRepository } from "@/models";
import { MongoUtils } from "@/utils";

export class StoreService {
  constructor(private readonly storeRepository: StoreRepository) {}

  async listItems(): Promise<StoreItem[]> {
    return this.storeRepository.findAll();
  }

  async getItem(id: string): Promise<StoreItem> {
    const storeObjectId = MongoUtils.toObjectId(
      id,
      "ID do item da loja inválido",
    );
    const item = await this.storeRepository.findById(storeObjectId);
    if (!item) throw new Error("Item da loja não encontrado");
    return item;
  }

  async createItem(data: CreateStoreItemDto): Promise<StoreItem> {
    if (!data) throw new Error("Dados inválidos");
    const item = await this.storeRepository.create(data);
    if (!item) throw new Error("Falha ao criar item da loja");
    return item;
  }

  async updateItem(id: string, data: UpdateStoreItemDto): Promise<StoreItem> {
    const storeObjectId = MongoUtils.toObjectId(
      id,
      "ID do item da loja inválido",
    );
    const updated = await this.storeRepository.update(storeObjectId, data);
    if (!updated) throw new Error("Item da loja não encontrado");
    return updated;
  }

  async deleteItem(id: string): Promise<void> {
    const storeObjectId = MongoUtils.toObjectId(
      id,
      "ID do item da loja inválido",
    );

    const item = await this.storeRepository.findById(storeObjectId);
    if (!item) throw new Error("Item da loja não encontrado");

    const result = await this.storeRepository.delete(storeObjectId);
    if (!result) throw new Error("Falha ao deletar item da loja");
  }
}
