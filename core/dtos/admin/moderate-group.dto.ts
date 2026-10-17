import { groupItemStatusSchema } from "@/schemas";
import { z } from "zod";

export const moderateGroupDtoSchema = z
  .object({
    action: groupItemStatusSchema.extract(["accepted", "rejected"], {
      message: "Ação de moderação inválida. Escolha 'accepted' ou 'rejected'.",
    }),
    note: z.string().trim().max(180).optional(),
  })
  .strict();

export type ModerateGroupDto = z.infer<typeof moderateGroupDtoSchema>;
