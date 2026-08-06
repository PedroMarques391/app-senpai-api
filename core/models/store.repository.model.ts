import type { CreateStoreItemDto, UpdateStoreItemDto } from "core/dtos";
import type { StoreItem } from "./store.model";

export interface StoreRepository {
  findAll(): Promise<StoreItem[]>;
  findById(id: string): Promise<StoreItem | null>;
  create(data: CreateStoreItemDto): Promise<StoreItem>;
  update(id: string, data: UpdateStoreItemDto): Promise<StoreItem | null>;
  delete(id: string): Promise<void>;
}
