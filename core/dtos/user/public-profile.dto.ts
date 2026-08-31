import { userSchema } from "core/schemas";
import type { z } from "zod";

export const publicProfileDtoSchema = userSchema.pick({
  name: true,
  userName: true,
  avatar_url: true,
  banner_url: true,
  isVerifiedCreator: true,
  createdAt: true,
});

export type PublicProfileDto = z.infer<typeof publicProfileDtoSchema>;
