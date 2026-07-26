import type { CreateStoreItemDto } from "core/dtos/store/create-store-item.dto";
import type { UpdateStoreItemDto } from "core/dtos/store/update-store-item.dto";
import type { StoreItem } from "core/models/store.model";

export interface StoreRepository {
  findAll(): Promise<StoreItem[]>;
  findById(id: string): Promise<StoreItem | null>;
  create(data: CreateStoreItemDto): Promise<StoreItem>;
  update(id: string, data: UpdateStoreItemDto): Promise<StoreItem | null>;
  delete(id: string): Promise<void>;
}
