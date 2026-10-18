import { z } from "zod";

export const updateUserDtoSchema = z
  .object({
    name: z.string().optional(),
    userName: z.string().optional(),
    email: z.string().trim().toLowerCase().email().optional(),
    bio: z.string().max(120).nullish(),
    avatar_url: z.string().nullish(),
    banner_url: z.string().nullish(),
    preferred_payment: z.string().nullish(),
  })
  .loose();

export const UpdateUserSchema = updateUserDtoSchema;
export type UpdateUserDto = z.infer<typeof updateUserDtoSchema>;
