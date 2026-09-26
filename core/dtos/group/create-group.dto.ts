import { groupSchema } from "core/schemas";
import type { z } from "zod";

export const createGroupDtoSchema = groupSchema
  .pick({
    title: true,
    link: true,
  })
  .strict();

export type CreateGroupDto = z.infer<typeof createGroupDtoSchema>;
