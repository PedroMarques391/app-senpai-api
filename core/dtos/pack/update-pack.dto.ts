import { createPackDtoSchema } from "./create-pack.dto";
import type { z } from "zod";

export const updatePackDtoSchema = createPackDtoSchema.partial().strict();

export type UpdatePackDto = z.infer<typeof updatePackDtoSchema>;
