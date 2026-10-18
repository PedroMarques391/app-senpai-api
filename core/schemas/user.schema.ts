import { ObjectId } from "mongodb";
import { z } from "zod";

export const USER_ROLES = ["user", "admin", "moderator"] as const;
export const userRoleEnum = z.enum(USER_ROLES, {
  message: "Cargo de usuário inválido.",
});
export type UserRole = z.infer<typeof userRoleEnum>;

export const USER_ACCOUNT_TYPES = [
  "member",
  "senpai",
  "developer",
  "owner",
  "partner",
  "company",
] as const;
export const userAccountTypeEnum = z.enum(USER_ACCOUNT_TYPES, {
  message: "Tipo de conta inválido.",
});
export type UserAccountType = z.infer<typeof userAccountTypeEnum>;

export const USER_STATUSES = ["active", "inactive", "restricted"] as const;
export const userStatusEnum = z.enum(USER_STATUSES, {
  message: "Status de usuário inválido.",
});
export type UserStatus = z.infer<typeof userStatusEnum>;

export const VIP_TYPES = ["FREE", "PRO", "MESTRE"] as const;
export const vipTypeEnum = z.enum(VIP_TYPES, {
  message: "Tipo de assinatura inválido.",
});
export type VipType = z.infer<typeof vipTypeEnum>;

export const VIP_PLANS = ["VIP_PRO", "VIP_MESTRE"] as const;
export const vipPlanEnum = z.enum(VIP_PLANS, {
  message: "Plano VIP inválido.",
});
export type VipPlan = z.infer<typeof vipPlanEnum>;

export const userSubscriptionSchema = z.object({
  start: z.coerce.date().optional().nullable(),
  end: z.coerce.date().optional().nullable(),
  type: z
    .preprocess((val) => {
      if (!val) return "FREE";
      const normalized = String(val).trim().toUpperCase();
      if (normalized === "PREMIUM") return "PRO";
      return (VIP_TYPES as readonly string[]).includes(normalized)
        ? (normalized as VipType)
        : "FREE";
    }, vipTypeEnum)
    .default("FREE"),
  plan: vipPlanEnum.optional().nullable(),
});
export type UserSubscription = z.infer<typeof userSubscriptionSchema>;

export const userAchievementReferenceSchema = z.object({
  id: z.string(),
  title: z.string(),
});
export type UserAchievementReference = z.infer<
  typeof userAchievementReferenceSchema
>;

export const userActivitySchema = z.object({
  current_streak: z.number().int().nonnegative().default(0),
  last_active_date: z.string().optional(),
  week_cycle: z.string().optional(),
  weekly_active_days: z.array(z.string()).default([]),
});
export type UserActivity = z.infer<typeof userActivitySchema>;

export const equippedCosmeticsSchema = z.object({
  card_style: z.string().default("card_style_default"),
  effect: z.string().default("effect_none"),
  background: z.string().default("background_default"),
});
export type EquippedCosmetics = z.infer<typeof equippedCosmeticsSchema>;

export const userSchema = z.object({
  _id: z.instanceof(ObjectId),
  wa_id: z.string(),
  isVerifiedCreator: z.boolean().default(false),
  name: z.string(),
  userName: z.string().trim().toLowerCase(),
  password: z.string(),
  bio: z.string().max(120).optional(),
  premium: z.boolean().default(false),
  role: userRoleEnum.default("user"),
  accountType: z
    .preprocess((val) => val ?? "member", userAccountTypeEnum)
    .default("member"),
  createdAt: z.coerce.date().default(() => new Date()),
  updatedAt: z.coerce.date().default(() => new Date()),
  deletedAt: z.coerce.date().optional(),
  last_login: z.coerce.date().default(() => new Date()),
  status: userStatusEnum.default("active"),
  preferred_payment: z.string().optional(),
  avatar_url: z.url().optional(),
  banner_url: z.url().optional(),
  subscription: z
    .preprocess((val) => val ?? { type: "FREE" }, userSubscriptionSchema)
    .default({ type: "FREE" }),
  email: z.email().trim().toLowerCase(),
  isEmailVerified: z.boolean().default(false),
  isNumberVerified: z.boolean().default(false),
  termsAccepted: z.boolean().default(false),
  petals_balance: z.number().default(0),
  daily_missions: z
    .object({
      cycle_date: z.string(),
      claimed_keys: z.array(z.string()).default([]),
    })
    .optional(),
  stickers_count: z
    .object({
      static: z.number().default(0),
      dynamic: z.number().default(0),
    })
    .default({ static: 0, dynamic: 0 }),
  storage_used_bytes: z.number().nonnegative().default(0),
  total_xp: z.number().int().nonnegative().default(0),
  strikes: z.number().int().nonnegative().default(0),
  activity: userActivitySchema.default({
    current_streak: 0,
    weekly_active_days: [],
  }),
  achievements: z.array(userAchievementReferenceSchema).default([]),
  equipped_cosmetics: z
    .preprocess((val) => val ?? {}, equippedCosmeticsSchema)
    .default({
      card_style: "card_style_default",
      effect: "effect_none",
      background: "background_default",
    }),
});
