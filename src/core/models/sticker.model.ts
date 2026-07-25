import { z } from "zod";
import { stickerSchema } from "@core/schemas";

export type Sticker = z.infer<typeof stickerSchema>;
