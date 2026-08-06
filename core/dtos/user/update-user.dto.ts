import { userSchema } from "core/schemas/user.schema";
import type { z } from "zod";

export const updateUserDtoSchema = userSchema
  .omit({
    _id: true,
    wa_id: true,
    createdAt: true,
    updatedAt: true,
    otp_secret: true,
  })
  .partial();

export type UpdateUserDto = z.infer<typeof updateUserDtoSchema>;
