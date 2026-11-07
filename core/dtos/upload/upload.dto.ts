import { z } from "zod";

export const uploadFolderEnum = z.enum([
  "sticker",
  "stickers",
  "banner",
  "banners",
  "avatar",
  "avatars",
]);

export type UploadFolder = z.infer<typeof uploadFolderEnum>;

export const uploadPresignedQuerySchema = z.object({
  folder: uploadFolderEnum.default("stickers"),
});

export type UploadPresignedQueryDto = z.infer<
  typeof uploadPresignedQuerySchema
>;

export const uploadSignatureQuerySchema = uploadPresignedQuerySchema;
export type UploadSignatureQueryDto = UploadPresignedQueryDto;


