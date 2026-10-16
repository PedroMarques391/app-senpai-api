import {
  equippedCosmeticsSchema,
  userSchema,
  type EquippedCosmetics,
  type VipType,
  vipTypeEnum,
  userAccountTypeEnum,
  type UserAccountType,
  userRoleEnum,
  type UserRole,
} from "core/schemas";
import { z } from "zod";

export const insertUserSchema = userSchema.omit({ _id: true });
export type User = z.infer<typeof userSchema>;
export type CreateUserPayload = z.input<typeof insertUserSchema>;
export {
  equippedCosmeticsSchema,
  type EquippedCosmetics,
  type VipType,
  vipTypeEnum,
  userAccountTypeEnum,
  type UserAccountType,
  userRoleEnum,
  type UserRole,
};
