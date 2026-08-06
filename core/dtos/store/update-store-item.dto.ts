import { createStoreItemDtoSchema } from "./create-store-item.dto";
import type { z } from "zod";

export const updateStoreItemDtoSchema = createStoreItemDtoSchema.partial();

export type UpdateStoreItemDto = z.infer<typeof updateStoreItemDtoSchema>;
