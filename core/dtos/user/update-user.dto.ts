import { z } from "zod";

export const updateUserDtoSchema = z
  .object({
    name: z.string().optional(),
    userName: z.string().optional(),
    email: z.email().trim().toLowerCase().optional(),
    bio: z.string().max(120).nullish(),
    avatar_url: z.url().nullish(),
    banner_url: z.url().nullish(),
    preferred_payment: z.string().nullish(),
  })
  .loose();

export const UpdateUserSchema = updateUserDtoSchema;
export type UpdateUserDto = z.infer<typeof updateUserDtoSchema>;
