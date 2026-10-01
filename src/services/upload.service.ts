import { UploadError } from "@/errors";
import type { UploadResult } from "@/types";
import { v2 as cloudinary, type UploadApiOptions } from "cloudinary";
import type { Readable } from "node:stream";

export class UploadService {
  async upload(
    fileStream: Readable,
    options?: UploadApiOptions,
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      let isSettled = false;

      const rejectOnce = (err: Error) => {
        if (isSettled) return;
        isSettled = true;
        reject(err);
      };

      const resolveOnce = (result: UploadResult) => {
        if (isSettled) return;
        isSettled = true;
        resolve(result);
      };

      const uploadedFile = cloudinary.uploader.upload_stream(
        {
          resource_type: "auto",
          ...options,
        },
        (error, uploadResult) => {
          if (isSettled) return;
          if (error || !uploadResult) {
            const raw =
              error ||
              new Error("Não foi possível enviar o arquivo. Tente novamente.");
            const msg = String(raw.message || "").toLowerCase();
            if (
              msg.includes("invalid image") ||
              msg.includes("unsupported") ||
              msg.includes("format")
            ) {
              return rejectOnce(
                new UploadError(
                  "Formato de arquivo inválido ou não suportado. Envie imagens PNG, JPEG, GIF ou WebP.",
                  "INVALID_FILE_FORMAT",
                  400,
                ),
              );
            }
            return rejectOnce(
              new UploadError(
                raw.message ||
                  "Não foi possível enviar o arquivo. Tente novamente.",
                "UPLOAD_FAILED",
                (raw as any).statusCode ?? 400,
              ),
            );
          }

          return resolveOnce({
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

      uploadedFile.on("error", (err) => {
        rejectOnce(new UploadError(err.message, "UPLOAD_STREAM_ERROR", 400));
      });

      fileStream.on("error", (err) => {
        fileStream.unpipe(uploadedFile);
        uploadedFile.destroy();
        rejectOnce(new UploadError(err.message, "UPLOAD_STREAM_ERROR", 400));
      });

      fileStream.on("limit", () => {
        fileStream.unpipe(uploadedFile);
        fileStream.resume();
        uploadedFile.destroy();
        rejectOnce(
          new UploadError(
            "O arquivo excede o limite máximo permitido de 25 MB.",
            "FILE_TOO_LARGE",
            413,
          ),
        );
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
      throw new UploadError(
        "Não foi possível excluir o arquivo. Tente novamente.",
        "DELETE_FAILED",
        400,
      );
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
