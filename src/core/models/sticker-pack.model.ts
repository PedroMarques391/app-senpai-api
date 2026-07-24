import { z } from "zod";
import { stickerPackSchema } from "../schemas";

export type StickerPack = z.infer<typeof stickerPackSchema>;
