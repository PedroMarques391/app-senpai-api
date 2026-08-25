import { stickerSchema } from "@/schemas";
import type { z } from "zod";

export const insertStickerSchema = stickerSchema.omit({ _id: true });
export type Sticker = z.infer<typeof stickerSchema>;
export type CreateStickerPayload = z.input<typeof insertStickerSchema>;
