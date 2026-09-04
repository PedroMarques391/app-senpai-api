import { userSchema } from "core/schemas";
import type { z } from "zod";

export const updateUserDtoSchema = userSchema
  .omit({
    _id: true,
    wa_id: true,
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
    role: true,
    status: true,
    password: true,
    isVerifiedCreator: true,
    isEmailVerified: true,
    isNumberVerified: true,
    petals_balance: true,
    stickers_count: true,
    daily_missions: true,
    subscriptions: true,
    last_login: true,
    termsAccepted: true,
  })
  .partial()
  .strict();

export type UpdateUserDto = z.infer<typeof updateUserDtoSchema>;
