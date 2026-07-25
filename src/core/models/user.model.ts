import { z } from "zod";
import { userSchema } from "@core/schemas";

export type User = z.infer<typeof userSchema>;
