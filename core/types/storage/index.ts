import type { GetObjectCommandOutput } from "@aws-sdk/client-s3";

export interface UploadFileOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

export type StorageBody = Buffer | Uint8Array | Blob | string | ReadableStream;

export interface StorageProvider {
  uploadFile(
    key: string,
    file: StorageBody,
    options?: UploadFileOptions,
  ): Promise<void>;
  getFile(key: string): Promise<GetObjectCommandOutput>;
  deleteFile(key: string): Promise<void>;
  getPublicUrl(key: string): string;
}
