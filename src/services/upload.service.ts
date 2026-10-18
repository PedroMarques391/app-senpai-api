import { UploadError } from "@/errors";
import type { UploadSignatureResponse } from "@/types";
import { v2 as cloudinary } from "cloudinary";

export class UploadService {
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

  generateSignature(
    folderPath: string,
    filename: string,
  ): UploadSignatureResponse {
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

    if (!apiSecret || !apiKey || !cloudName) {
      throw new UploadError(
        "Configurações do Cloudinary ausentes no servidor",
        "CLOUDINARY_CONFIG_MISSING",
        500,
      );
    }

    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = {
      folder: folderPath,
      public_id: filename,
      timestamp,
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      apiSecret,
    );

    return {
      signature,
      timestamp,
      api_key: apiKey,
      cloud_name: cloudName,
      folder: folderPath,
      public_id: filename,
    };
  }
}
