import { userSchema } from "core/schemas";
import type { z } from "zod";

export const publicProfileDtoSchema = userSchema.pick({
  name: true,
  userName: true,
  avatar_url: true,
  banner_url: true,
  bio: true,
  isVerifiedCreator: true,
  createdAt: true,
  subscription: true,
  activity: true,
  role: true,
  accountType: true,
  equipped_cosmetics: true,
});

export type PublicProfileDto = z.infer<typeof publicProfileDtoSchema>;
