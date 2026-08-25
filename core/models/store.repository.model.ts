import type { ObjectId } from "mongodb";
import type { CreateStoreItemPayload, StoreItem } from "./store.model";

export interface StoreRepository {
  findAll(): Promise<StoreItem[]>;
  findById(id: ObjectId): Promise<StoreItem | null>;
  create(data: CreateStoreItemPayload): Promise<StoreItem>;
  update(id: ObjectId, data: Partial<StoreItem>): Promise<StoreItem | null>;
  delete(id: ObjectId): Promise<boolean>;
}
