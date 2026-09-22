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
              error ||
              new Error("Não foi possível enviar o arquivo. Tente novamente."),
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

      fileStream.on("error", (err) => {
        uploadedFile.destroy(err);
        reject(err);
      });

      fileStream.on("limit", () => {
        const err = new Error("O arquivo excedeu o limite máximo permitido.");
        uploadedFile.destroy(err);
        reject(err);
      });

      fileStream.pipe(uploadedFile);
    });
  }

  async delete(publicId: string): Promise<unknown> {
    let result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    });

    if (result.result === "not found") {
      result = await cloudinary.uploader.destroy(publicId, {
        resource_type: "video",
      });
    }

    if (result.result !== "ok") {
      throw new Error("Não foi possível excluir o arquivo. Tente novamente.");
    }
    return result;
  }

  async deleteQuietly(publicId: string): Promise<boolean> {
    try {
      let result = await cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
      });
      if (result.result === "not found") {
        result = await cloudinary.uploader.destroy(publicId, {
          resource_type: "video",
        });
      }
      return result.result === "ok" || result.result === "not found";
    } catch {
      return false;
    }
  }

  async deleteManyQuietly(publicIds: string[]): Promise<void> {
    if (publicIds.length === 0) return;
    await Promise.allSettled(
      publicIds.map((publicId) => this.deleteQuietly(publicId)),
    );
  }
}
