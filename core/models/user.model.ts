import { userSchema } from "core/schemas";
import { z } from "zod";

export type User = z.infer<typeof userSchema>;
