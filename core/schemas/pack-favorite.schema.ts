import { ObjectId } from "mongodb";
import { z } from "zod";

export const packFavoriteSchema = z.object({
  _id: z.instanceof(ObjectId),
  pack_id: z.instanceof(ObjectId),
  user_id: z.instanceof(ObjectId),
  created_at: z.coerce.date().default(() => new Date()),
});
