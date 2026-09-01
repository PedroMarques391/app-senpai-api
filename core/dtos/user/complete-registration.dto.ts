import { userSchema } from "core/schemas";
import type { z } from "zod";

export const completeRegistrationDtoSchema = userSchema
  .pick({
    name: true,
    userName: true,
    email: true,
    password: true,
  })
  .strict();

export type CompleteRegistrationDto = z.infer<
  typeof completeRegistrationDtoSchema
>;
