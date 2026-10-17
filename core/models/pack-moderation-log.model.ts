import { insertPackModerationLogSchema, packModerationLogSchema } from "@/schemas";
import { z } from "zod";

export { insertPackModerationLogSchema };
export type PackModerationLog = z.infer<typeof packModerationLogSchema>;
export type CreatePackModerationLogPayload = z.input<
  typeof insertPackModerationLogSchema
>;
