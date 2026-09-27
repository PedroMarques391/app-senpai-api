import { groupItemSchema } from "@/schemas";
import type { z } from "zod";

export const updateGroupItemDtoSchema = groupItemSchema
  .pick({
    title: true,
    url: true,
  })
  .partial()
  .strict();

export type UpdateGroupItemDto = z.infer<typeof updateGroupItemDtoSchema>;
