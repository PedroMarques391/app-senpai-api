import { stickerPackSchema } from "core/schemas";
import type { z } from "zod";

export const createPackDtoSchema = stickerPackSchema.pick({
  user_id: true,
  pack_name: true,
  publisher: true,
  icon_url: true,
  is_public: true,
  stickers: true,
});

export type CreatePackDto = z.infer<typeof createPackDtoSchema>;
