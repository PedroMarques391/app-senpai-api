import { StoreItem } from "@core/models/store.model";

export type CreateStoreItemDto = Omit<StoreItem, "_id" | "created_at">;
