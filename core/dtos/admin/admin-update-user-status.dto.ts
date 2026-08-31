import { userStatusEnum } from "@/schemas";
import { z } from "zod";

export const adminUpdateUserStatusDtoSchema = z
  .object({
    status: userStatusEnum,
    reason: z.string().min(5, "O motivo deve conter no mínimo 5 caracteres").max(255).optional(),
  })
  .strict();

export type AdminUpdateUserStatusDto = z.infer<typeof adminUpdateUserStatusDtoSchema>;
