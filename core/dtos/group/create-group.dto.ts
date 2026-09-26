import { groupSchema } from "core/schemas";
import type { z } from "zod";

export const createGroupDtoSchema = groupSchema
  .pick({
    groups: true,
  })
  .strict();

export type CreateGroupDto = z.infer<typeof createGroupDtoSchema>;
