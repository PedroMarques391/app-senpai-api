import z from "zod";
import { storeItemSchema } from "@core/schemas";

export type StoreItem = z.infer<typeof storeItemSchema>;
