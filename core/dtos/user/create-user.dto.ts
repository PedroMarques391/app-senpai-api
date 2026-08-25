import { userSchema } from "core/schemas";
import { z } from "zod";

export const createUserDtoSchema = userSchema
  .pick({
    wa_id: true,
    email: true,
    userName: true,
    name: true,
    password: true,
  })
  .strict();

export type CreateUserDto = z.infer<typeof createUserDtoSchema>;
