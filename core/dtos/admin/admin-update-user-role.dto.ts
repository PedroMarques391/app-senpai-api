import { userRoleEnum } from "@/schemas";
import { z } from "zod";

export const adminUpdateUserRoleDtoSchema = z
  .object({
    role: userRoleEnum,
    reason: z.string().min(5, "O motivo deve conter no mínimo 5 caracteres").max(255).optional(),
  })
  .strict();

export type AdminUpdateUserRoleDto = z.infer<typeof adminUpdateUserRoleDtoSchema>;
