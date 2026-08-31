import { z } from "zod";

export const adminAdjustPetalsDtoSchema = z
  .object({
    amount: z
      .number()
      .int("A quantidade de pétalas deve ser um número inteiro")
      .refine((val) => val !== 0, {
        message: "O valor de ajuste não pode ser zero",
      }),
    reason: z
      .string()
      .min(5, "O motivo deve conter no mínimo 5 caracteres")
      .max(255, "O motivo não pode exceder 255 caracteres"),
  })
  .strict();

export type AdminAdjustPetalsDto = z.infer<typeof adminAdjustPetalsDtoSchema>;
