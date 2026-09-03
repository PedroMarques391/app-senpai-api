import { createPackDtoSchema } from "./create-pack.dto";
import type { z } from "zod";

export const updatePackDtoSchema = createPackDtoSchema
  .omit({ stickers: true })
  .partial()
  .strict();

export type UpdatePackDto = z.infer<typeof updatePackDtoSchema>;
