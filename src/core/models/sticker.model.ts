import { z } from "zod";
import { stickerSchema } from "../schemas";

export type Sticker = z.infer<typeof stickerSchema>;
