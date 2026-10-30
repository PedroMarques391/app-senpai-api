import type { StorageBody, StorageProvider, UploadFileOptions } from "@/types";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class CloudFlareR2Provider implements StorageProvider {
  private readonly accessKeyId = process.env.R2_ACCESS_KEY_ID;
  private readonly secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  private readonly bucketName = process.env.BUCKET_NAME;
  private readonly endpoint = process.env.R2_ENDPOINT;
  private readonly client: S3Client;

  constructor() {
    this.client = new S3Client({
      region: "auto",
      endpoint: this.endpoint,
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
    });
  }

  async uploadFile(
    key: string,
    file: StorageBody,
    options?: UploadFileOptions,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file as StorageBody,
        ContentType: options?.contentType,
        Metadata: options?.metadata,
        CacheControl:
          options?.cacheControl ?? "public, max-age=31536000, immutable",
      }),
    );
  }

  async getFile(key: string) {
    return this.client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );
  }

  async deleteFile(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );
  }

  getPublicUrl(key: string): string {
    const baseUrl =
      process.env.R2_PUBLIC_URL || "https://media.botdosenpai.com.br";
    const cleanKey = key.startsWith("/") ? key.slice(1) : key;
    return `${baseUrl.replace(/\/+$/, "")}/${cleanKey}`;
  }

  async getPresignedUploadUrl(
    key: string,
    contentType?: string,
    expiresInSeconds = 300,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });

    return getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
    });
  }
}
