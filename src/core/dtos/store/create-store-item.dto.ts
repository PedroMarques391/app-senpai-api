import { StoreItem } from "../../models/store.model";

export type CreateStoreItemDto = Omit<StoreItem, "_id" | "created_at">;
