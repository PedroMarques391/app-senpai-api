import { userSchema } from "core/schemas/user.schema";
import { z } from "zod";

export const createUserDtoSchema = userSchema.pick({
  wa_id: true,
  email: true,
  userName: true,
  name: true,
  password: true,
});

export type CreateUserDto = z.infer<typeof createUserDtoSchema>;
