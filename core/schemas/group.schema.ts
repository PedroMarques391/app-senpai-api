import { ObjectId } from "mongodb";
import { randomUUID } from "node:crypto";
import z from "zod";

export const GROUP_ITEM_STATUSES = [
  "pending",
  "accepted",
  "rejected",
] as const;
export const groupItemStatusSchema = z.enum(GROUP_ITEM_STATUSES, {
  message: "Status do grupo inválido.",
});
export type GroupItemStatus = z.infer<typeof groupItemStatusSchema>;

export const GROUP_REQUEST_TYPES = ["new", "updated"] as const;
export const groupRequestTypeSchema = z.enum(GROUP_REQUEST_TYPES, {
  message: "Tipo de solicitação inválido.",
});
export type GroupRequestType = z.infer<typeof groupRequestTypeSchema>;

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