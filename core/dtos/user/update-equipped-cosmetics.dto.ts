import { z } from "zod";

export const updateEquippedCosmeticsDtoSchema = z.object({
  card_style: z.string().optional(),
  effect: z.string().optional(),
  background: z.string().optional(),
});

export type UpdateEquippedCosmeticsDto = z.infer<
  typeof updateEquippedCosmeticsDtoSchema
>;
