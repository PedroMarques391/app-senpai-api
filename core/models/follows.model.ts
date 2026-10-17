import { followerSchema } from "@/schemas";
import { z } from "zod";

export const insertFollowerSchema = followerSchema.omit({
  _id: true,
});

export type Follow = z.infer<typeof followerSchema>;
export type CreateFollowPayload = z.input<typeof insertFollowerSchema>;
