import { storeItemSchema } from "core/schemas";
import z from "zod";

export type StoreItem = z.infer<typeof storeItemSchema>;
