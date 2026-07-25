import z from "zod";
import { storeItemSchema } from "../schemas";

export type StoreItem = z.infer<typeof storeItemSchema>;
