import { groupSchema } from "@/schemas";
import z from "zod";

export const insertGroupSchema = groupSchema.omit({ _id: true });
export type Group = z.infer<typeof groupSchema>;
export type CreateGroupPayload = z.input<typeof insertGroupSchema>;
