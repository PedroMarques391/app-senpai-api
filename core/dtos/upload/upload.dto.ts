import { z } from "zod";

export const uploadSignatureQuerySchema = z.object({
  folder: z.enum(["sticker", "banner", "avatar"]).default("sticker"),
});

export type UploadSignatureQueryDto = z.infer<
  typeof uploadSignatureQuerySchema
>;
