import { dailyMissionSchema } from "core/schemas/daily-mission.schema";
import { ObjectId } from "mongodb";
import { z } from "zod";

export const userSchema = z.object({
  _id: z.instanceof(ObjectId),
  wa_id: z.string(),
  isverifiedCreator: z.boolean().default(false),
  name: z.string(),
  userName: z.string(),
  password: z.string().optional(),
  premium: z.boolean().default(false),
  updatedAt: z.coerce.date(),
  last_login: z.coerce.date().default(new Date()),
  status: z.enum(["active", "inactive"]).default("active"),
  preferred_payment: z.string().optional(),
  subscriptions: z.object({
    start: z.coerce.date(),
  }),
  email: z.email().optional(),
  isEmailVerified: z.boolean().default(false),
  petals_balance: z.number().default(0),
  daily_missions: z
    .object({
      last_reset: z.coerce.date(),
      missions: z.array(dailyMissionSchema),
    })
    .optional(),
  otp_secret: z
    .object({
      code: z.string(),
      expires_at: z.coerce.date(),
      lastSend: z.coerce.date(),
    })
    .optional(),
});
