import { storeItemSchema } from "core/schemas";
import type { z } from "zod";

export const createStoreItemDtoSchema = storeItemSchema
  .omit({
    _id: true,
    created_at: true,
    updated_at: true,
    purchases_count: true,
    is_active: true,
  })
  .strict();

export type CreateStoreItemDto = z.infer<typeof createStoreItemDtoSchema>;
