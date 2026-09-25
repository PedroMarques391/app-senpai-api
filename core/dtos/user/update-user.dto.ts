import { userSchema } from "core/schemas";
import type { z } from "zod";

export const updateUserDtoSchema = userSchema
  .pick({
    name: true,
    userName: true,
    email: true,
    bio: true,
    avatar_url: true,
    banner_url: true,
    preferred_payment: true,
  })
  .partial()
  .strict();

export type UpdateUserDto = z.infer<typeof updateUserDtoSchema>;
