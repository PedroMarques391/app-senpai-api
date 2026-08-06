import { createPackDtoSchema } from "./create-pack.dto";
import type { z } from "zod";

export const updatePackDtoSchema = createPackDtoSchema.partial();

export type UpdatePackDto = z.infer<typeof updatePackDtoSchema>;
