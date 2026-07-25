import { z } from "zod";
import { stickerPackSchema } from "@core/schemas";

export type StickerPack = z.infer<typeof stickerPackSchema>;
