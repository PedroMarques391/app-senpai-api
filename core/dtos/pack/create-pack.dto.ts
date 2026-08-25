import { stickerPackSchema } from "core/schemas";
import type { z } from "zod";

export const createPackDtoSchema = stickerPackSchema
  .pick({
    pack_name: true,
    icon_url: true,
    is_public: true,
    description: true,
  })
  .strict();

export type CreatePackDto = z.infer<typeof createPackDtoSchema>;
