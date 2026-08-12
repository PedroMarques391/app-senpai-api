import { createStickerDtoSchema } from "./create-sticker.dto";
import type { z } from "zod";

export const updateStickerDtoSchema = createStickerDtoSchema.partial();

export type UpdateStickerDto = z.infer<typeof updateStickerDtoSchema>;
