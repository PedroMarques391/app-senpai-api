import { storeItemSchema, storeItemStatusEnum } from "@/schemas";
import type { z } from "zod";

export const createStoreItemDtoSchema = storeItemSchema
  .omit({
    _id: true,
    created_at: true,
    updated_at: true,
    purchases_count: true,
  })
  .extend({
    status: storeItemStatusEnum.optional().default("active"),
  })
  .strict();

export const CreateStoreItemSchema = createStoreItemDtoSchema;
export type CreateStoreItemDto = z.infer<typeof createStoreItemDtoSchema>;
