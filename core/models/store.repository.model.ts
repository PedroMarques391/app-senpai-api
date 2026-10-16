import type { Filter, ObjectId } from "mongodb";
import type {
  CreateStoreItemPayload,
  StoreItem,
  StoreItemStatus,
} from "./store.model";

export type StoreItemIdentifier = Filter<
  Pick<StoreItem, "_id" | "code" | "status">
>;

export interface StoreRepository {
  find(filter: StoreItemIdentifier): Promise<StoreItem | null>;
  findAll(status?: StoreItemStatus): Promise<StoreItem[]>;
  findById(id: ObjectId): Promise<StoreItem | null>;
  create(data: CreateStoreItemPayload): Promise<StoreItem>;
  update(id: ObjectId, data: Partial<StoreItem>): Promise<StoreItem | null>;
  delete(id: ObjectId): Promise<boolean>;
  incrementPurchasesCount(id: ObjectId): Promise<void>;
}
