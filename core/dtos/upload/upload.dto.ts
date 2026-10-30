import { z } from "zod";

export const uploadPresignedQuerySchema = z.object({
  folder: z.enum(["sticker", "banner", "avatar"]).default("sticker"),
});

export type UploadPresignedQueryDto = z.infer<
  typeof uploadPresignedQuerySchema
>;

export const uploadSignatureQuerySchema = uploadPresignedQuerySchema;
export type UploadSignatureQueryDto = UploadPresignedQueryDto;

