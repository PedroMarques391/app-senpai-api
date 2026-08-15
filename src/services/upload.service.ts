import type { UploadResult } from "@/types";
import { v2 as cloudinary, type UploadApiOptions } from "cloudinary";
import type { Readable } from "node:stream";

export class UploadService {
  async upload(
    fileStream: Readable,
    options?: UploadApiOptions,
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const uploadedFile = cloudinary.uploader.upload_stream(
        {
          resource_type: "auto",
          ...options,
        },
        (error, uploadResult) => {
          if (error || !uploadResult) {
            return reject(
              error || new Error("Falha ao realizar upload para o Cloudinary"),
            );
          }
          return resolve({
            public_id: uploadResult.public_id,
            secure_url: uploadResult.secure_url,
            url: uploadResult.url,
            format: uploadResult.format,
            bytes: uploadResult.bytes,
            width: uploadResult.width,
            height: uploadResult.height,
          });
        },
      );

      fileStream.pipe(uploadedFile);
    });
  }

  async delete(publicId: string): Promise<unknown> {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  }
}
