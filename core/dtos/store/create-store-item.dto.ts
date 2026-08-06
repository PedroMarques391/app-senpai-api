import { storeItemSchema } from "core/schemas";
import type { z } from "zod";

export const createStoreItemDtoSchema = storeItemSchema.omit({
  _id: true,
  created_at: true,
});

export type CreateStoreItemDto = z.infer<typeof createStoreItemDtoSchema>;
