import type { CreateStoreItemDto, UpdateStoreItemDto } from "@/dtos";
import { AppError, StoreItemNotFoundError } from "@/errors";
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
    const item = await this.storeRepository.find({ _id: storeObjectId });
    if (!item) throw new StoreItemNotFoundError();
    return item;
  }

  async findStoreItemByCode(code: string): Promise<StoreItem> {
    const item = await this.storeRepository.find({
      code: code.trim().toLowerCase(),
    });
    if (!item) throw new StoreItemNotFoundError();
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
    if (!existing) throw new StoreItemNotFoundError();

    const updated = await this.storeRepository.update(storeObjectId, dto);
    if (!updated) {
      throw new AppError(
        "Falha ao atualizar item da loja",
        500,
        "STORE_ITEM_UPDATE_FAILED",
      );
    }
    return updated;
  }

  async deleteStoreItem(id: string): Promise<boolean> {
    const storeObjectId = MongoUtils.toObjectId(
      id,
      "ID do item da loja inválido",
    );

    const existing = await this.storeRepository.findById(storeObjectId);
    if (!existing) throw new StoreItemNotFoundError();

    return this.storeRepository.delete(storeObjectId);
  }
}
