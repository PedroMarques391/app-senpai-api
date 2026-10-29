import type { StorageBody, StorageProvider, UploadFileOptions } from "@/types";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

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
    return `${this.endpoint}/${this.bucketName}/${key}`;
  }
}
