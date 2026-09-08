import { packFavoriteSchema } from "@/schemas";
import { z } from "zod";

export const insertPackFavoriteSchema = packFavoriteSchema.omit({
  _id: true,
});

export type PackFavorite = z.infer<typeof packFavoriteSchema>;
export type CreatePackFavoritePayload = z.input<
  typeof insertPackFavoriteSchema
>;
