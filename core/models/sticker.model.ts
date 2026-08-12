import { stickerSchema } from "@/schemas";
import type { z } from "zod";

export type Sticker = z.infer<typeof stickerSchema>;
