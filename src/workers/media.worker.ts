import { AppError } from "@/errors";
import { BullMQInitializer } from "@/init";
import { PackRepository, StickerRepository } from "@/repositories";
import type { CacheService, SharpService } from "@/services";
import type {
  MediaConversionType,
  MediaJobData,
  StorageProvider,
} from "@/types";
import { MongoUtils } from "@/utils";
import { Job, Worker } from "bullmq";
import type { FastifyBaseLogger } from "fastify";

export class MediaWorker {
  private worker: Worker<MediaJobData>;
  private readonly QUEUE_NAME = "media";

  constructor(
    private readonly storageProvider: StorageProvider,
    private readonly sharpService: SharpService,
    private readonly stickerRepository: StickerRepository,
    private readonly packRepository: PackRepository,
    private readonly cacheService: CacheService,
    private readonly logger?: FastifyBaseLogger,
  ) {
    this.worker = new Worker<MediaJobData>(
      this.QUEUE_NAME,
      this.process.bind(this),
      {
        connection: BullMQInitializer.connect(),
        concurrency: 5,
      },
    );

    this.setupListeners();
  }

  private async getBuffer(job: MediaJobData): Promise<Buffer> {
    if (job.fileBuffer) {
      return Buffer.from(job.fileBuffer, "base64");
    }

    const key = job.tempKey || job.fileUrl;
    if (!key) {
      throw new AppError("Nenhum tempKey ou buffer fornecido para o job.");
    }

    const response = await this.storageProvider.getFile(key);
    return Buffer.from(await (response.Body as any).transformToByteArray());
  }

  private convert(type: MediaConversionType, buffer: Buffer): Promise<Buffer> {
    switch (type) {
      case "animated":
        return this.sharpService.convertToAnimated(buffer);
      case "pack_icon":
        return this.sharpService.convertToStickerPackIcon(buffer);
      case "avatar":
        return this.sharpService.convertToAvatar(buffer);
      case "banner":
        return this.sharpService.convertToBanner(buffer);
      default:
        return this.sharpService.convertToStatic(buffer);
    }
  }

  private async process(job: Job<MediaJobData>): Promise<void> {
    const {
      type,
      packId,
      stickerId,
      userId,
      destinationPath,
      tempKey,
      isPackCover,
    } = job.data;
    this.logger?.info(
      { jobId: job.id, type, stickerId, packId },
      "[MediaWorker] Processando conversão",
    );

    const inputBuffer = await this.getBuffer(job.data);
    const finalBuffer = await this.convert(type, inputBuffer);

    let finalKey = destinationPath;
    if (!finalKey) {
      switch (type) {
        case "pack_icon":
          finalKey = `packs/${packId}/icon.webp`;
          break;
        case "avatar":
          finalKey = `avatars/${userId}/avatar.webp`;
          break;
        case "banner":
          finalKey = `banners/${userId}/banner.webp`;
          break;
        case "static":
        case "animated":
        default:
          finalKey = `stickers/${packId}/${stickerId}.webp`;
          break;
      }
    }

    await this.storageProvider.uploadFile(finalKey, finalBuffer, {
      contentType: "image/webp",
      cacheControl: "public, max-age=31536000, immutable",
    });

    const publicUrl = this.storageProvider.getPublicUrl(finalKey);

    const userObjectId = userId ? MongoUtils.toObjectId(userId) : undefined;
    const packObjectId = packId ? MongoUtils.toObjectId(packId) : undefined;

    if (type === "pack_icon" && packObjectId && userObjectId) {
      await this.packRepository.update(packObjectId, userObjectId, {
        icon_url: publicUrl,
        icon_file_key: finalKey,
      });
    }

    if (stickerId && userObjectId) {
      await this.stickerRepository.update(
        MongoUtils.toObjectId(stickerId),
        userObjectId,
        {
          sticker_url: publicUrl,
          file_key: finalKey,
          size_bytes: finalBuffer.length,
        },
      );
    }

    if (packObjectId && userObjectId && type !== "pack_icon") {
      const pack = await this.packRepository.findById(packObjectId);
      if (pack && (!pack.icon_url || isPackCover === true)) {
        const iconBuffer = await this.sharpService.convertToStickerPackIcon(
          inputBuffer,
          { isAnimated: type === "animated" },
        );
        const iconKey = `packs/${packId}/icon.webp`;
        await this.storageProvider.uploadFile(iconKey, iconBuffer, {
          contentType: "image/webp",
          cacheControl: "public, max-age=31536000, immutable",
        });
        const iconUrl = this.storageProvider.getPublicUrl(iconKey);

        await this.packRepository.update(packObjectId, userObjectId, {
          icon_url: iconUrl,
          icon_file_key: iconKey,
        });
      }
    }

    if (tempKey) {
      setTimeout(() => {
        this.storageProvider.deleteFile(tempKey).catch((err) => {
          this.logger?.warn(
            { tempKey, err: err?.message },
            "[MediaWorker] Falha ao excluir arquivo temporário",
          );
        });
      }, 120000).unref();
    }

    if (packId) {
      await Promise.allSettled([
        this.cacheService.del(`pack:${packId}`),
        this.cacheService.del(`stickers:pack:${packId}`),
        ...(userId ? [this.cacheService.del(`pack:user:${userId}`)] : []),
      ]);
    }

    this.logger?.info(
      { jobId: job.id, finalKey, publicUrl },
      "[MediaWorker] Conversão finalizada com sucesso",
    );
  }

  private setupListeners(): void {
    this.worker.on("ready", () => {
      this.logger?.info("[MediaWorker] Pronto para processar jobs");
    });

    this.worker.on("completed", (job) => {
      this.logger?.info(
        { jobId: job.id },
        `[MediaWorker] Job ${job.id} concluído com sucesso`,
      );
    });

    this.worker.on("failed", (job, err) => {
      this.logger?.error(
        { jobId: job?.id, err: err.message },
        `[MediaWorker] Job ${job?.id} falhou: ${err.message}`,
      );
    });
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
