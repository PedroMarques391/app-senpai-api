import { stickerSchema } from "core/schemas";
import { z } from "zod";

export type Sticker = z.infer<typeof stickerSchema>;
