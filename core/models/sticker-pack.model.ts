import { stickerPackSchema } from "core/schemas";
import { z } from "zod";

export type StickerPack = z.infer<typeof stickerPackSchema>;
