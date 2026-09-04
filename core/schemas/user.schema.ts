import { ObjectId } from "mongodb";
import { z } from "zod";
import { dailyMissionSchema } from "./daily-mission.schema";

export const userRoleEnum = z.enum(["user", "admin", "moderator", "company"]);
export type UserRole = z.infer<typeof userRoleEnum>;

export const userStatusEnum = z.enum(["active", "inactive"]);
export type UserStatus = z.infer<typeof userStatusEnum>;

export const userSchema = z.object({
  _id: z.instanceof(ObjectId),
  wa_id: z.string(),
  isVerifiedCreator: z.boolean().default(false),
  name: z.string(),
  userName: z.string(),
  password: z.string(),
  premium: z.boolean().default(false),
  role: userRoleEnum.default("user"),
  createdAt: z.coerce.date().default(() => new Date()),
  updatedAt: z.coerce.date().default(() => new Date()),
  deletedAt: z.coerce.date().optional(),
  last_login: z.coerce.date().default(() => new Date()),
  status: userStatusEnum.default("active"),
  preferred_payment: z.string().optional(),
  avatar_url: z.url().optional(),
  banner_url: z.url().optional(),
  subscriptions: z
    .object({
      start: z.coerce.date(),
    })
    .optional(),
  email: z.email(),
  isEmailVerified: z.boolean().default(false),
  isNumberVerified: z.boolean().default(false),
  termsAccepted: z.boolean().default(false),
  petals_balance: z.number().default(0),
  daily_missions: z
    .object({
      last_reset: z.coerce.date(),
      missions: z.array(dailyMissionSchema),
    })
    .optional(),
  stickers_count: z
    .object({
      static: z.number().default(0),
      dynamic: z.number().default(0),
    })
    .default({ static: 0, dynamic: 0 }),
});
