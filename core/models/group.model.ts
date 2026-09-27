import { groupItemSchema, groupItemStatusSchema, groupSchema } from "@/schemas";
import z from "zod";

export const insertGroupSchema = groupSchema.omit({ _id: true });
export type Group = z.infer<typeof groupSchema>;
export type GroupItem = z.infer<typeof groupItemSchema>;
export type GroupItemStatus = z.infer<typeof groupItemStatusSchema>;
export type CreateGroupPayload = z.input<typeof insertGroupSchema>;


