import { ObjectId } from "mongodb";
import z from "zod";

export const followersSchema = z.object({
  id: z.instanceof(ObjectId),
  followerId: z.instanceof(ObjectId),
  followingId: z.instanceof(ObjectId),
  created_at: z.coerce.date().default(() => new Date()),
});
