import { groupSchema } from "core/schemas";
import type { z } from "zod";

export const updateGroupDtoSchema = groupSchema
  .pick({
    groups: true,
  })
  .partial()
  .strict();

export type UpdateGroupDto = z.infer<typeof updateGroupDtoSchema>;
