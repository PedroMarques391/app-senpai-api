import { AppError } from "@/errors";
import type { StorageProvider } from "@/types";

export interface PresignedUploadResponse {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  expiresIn: number;
}

export class UploadService {
  constructor(private readonly storageProvider: StorageProvider) {}

  async delete(key: string): Promise<{ success: boolean; message: string }> {
    if (!key) {
      throw new AppError("Chave do arquivo não informada.", 400, "INVALID_FILE_KEY");
    }

    await this.storageProvider.deleteFile(key);
    return { success: true, message: "Arquivo excluído com sucesso." };
  }

  async deleteQuietly(key: string): Promise<boolean> {
    return this.storageProvider
      .deleteFile(key)
      .then(() => true)
      .catch(() => false);
  }

  async deleteManyQuietly(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await Promise.allSettled(keys.map((key) => this.deleteQuietly(key)));
  }

  async generatePresignedUrl(
    folderPath: string,
    filename: string,
    contentType = "image/webp",
  ): Promise<PresignedUploadResponse> {
    if (!folderPath || !filename) {
      throw new AppError(
        "Parâmetros de upload inválidos.",
        400,
        "INVALID_UPLOAD_PARAMS",
      );
    }

    const key = `${folderPath}/${filename}`;
    const expiresIn = 300;

    const uploadUrl = await this.storageProvider.getPresignedUploadUrl(
      key,
      contentType,
      expiresIn,
    );
    const publicUrl = this.storageProvider.getPublicUrl(key);

    return {
      uploadUrl,
      key,
      publicUrl,
      expiresIn,
    };
  }
}
