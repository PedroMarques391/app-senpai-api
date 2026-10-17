import {
  USER_ACCOUNT_TYPES,
  USER_ROLES,
  USER_STATUSES,
  VIP_PLANS,
  VIP_TYPES,
  equippedCosmeticsSchema,
  userAccountTypeEnum,
  userRoleEnum,
  userSchema,
  userStatusEnum,
  vipPlanEnum,
  vipTypeEnum,
  type EquippedCosmetics,
  type UserAccountType,
  type UserRole,
  type UserStatus,
  type VipPlan,
  type VipType,
} from "@/schemas";
import { z } from "zod";

export const insertUserSchema = userSchema.omit({ _id: true });
export type User = z.infer<typeof userSchema>;
export type CreateUserPayload = z.input<typeof insertUserSchema>;
export {
  USER_ACCOUNT_TYPES,
  USER_ROLES,
  USER_STATUSES,
  VIP_PLANS,
  VIP_TYPES,
  equippedCosmeticsSchema,
  userAccountTypeEnum,
  userRoleEnum,
  userStatusEnum,
  vipPlanEnum,
  vipTypeEnum,
  type EquippedCosmetics,
  type UserAccountType,
  type UserRole,
  type UserStatus,
  type VipPlan,
  type VipType,
};
