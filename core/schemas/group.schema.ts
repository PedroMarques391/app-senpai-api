import { ObjectId } from "mongodb";
import { randomUUID } from "node:crypto";
import z from "zod";

export const groupItemStatusSchema = z.enum(
  ["pending", "accepted", "rejected"],
  { message: "Status do grupo inválido." },
);

export const groupRequestTypeSchema = z.enum(
  ["new", "updated"],
  { message: "Tipo de solicitação inválido." },
);

export const groupItemSchema = z.object({
  id: z.string().default(() => randomUUID()),
  title: z.string().min(1, "O título é obrigatório"),
  url: z.url("A URL deve ser válida"),
  status: groupItemStatusSchema.default("pending"),
  requestType: groupRequestTypeSchema.default("new"),
  requested_at: z.coerce.date().default(() => new Date()),
  decided_at: z.coerce.date().optional(),
  decided_by: z.instanceof(ObjectId).optional(),
  decided_by_username: z.string().optional(),
  moderation_note: z.string().trim().max(180).optional(),
});

export const groupsSchema = z.object({
  _id: z.instanceof(ObjectId),
  user_id: z.instanceof(ObjectId),
  groups: z
    .array(groupItemSchema)
    .min(1, "É necessário adicionar pelo menos um grupo")
    .max(2, "É permitido adicionar no máximo 2 grupos"),
  created_at: z.coerce.date().default(() => new Date()),
  updated_at: z.coerce.date().default(() => new Date()),
});

export const groupSchema = groupsSchema;