import { z } from "zod";

export const updateUserDtoSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "O nome não pode ficar vazio.")
      .max(100, "O nome deve ter no máximo 100 caracteres.")
      .optional(),
    userName: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, "O nome de usuário deve ter no mínimo 3 caracteres.")
      .max(30, "O nome de usuário deve ter no máximo 30 caracteres.")
      .optional(),
    email: z.email().trim().toLowerCase().optional(),
    bio: z
      .string()
      .max(120, "A biografia deve ter no máximo 120 caracteres.")
      .nullish(),
    avatar_url: z.url().nullish(),
    banner_url: z.url().nullish(),
    preferred_payment: z.string().nullish(),
  })
  .strict()
  .refine((data) => Object.values(data).some((val) => val !== undefined), {
    message: "Ao menos um campo deve ser informado para atualização.",
  });

export const UpdateUserSchema = updateUserDtoSchema;
export type UpdateUserDto = z.infer<typeof updateUserDtoSchema>;
