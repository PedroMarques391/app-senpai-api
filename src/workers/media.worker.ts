import { AppError } from "@/errors";
import { BullMQInitializer } from "@/init";
import { PackRepository, StickerRepository } from "@/repositories";
import type { StickerFit } from "@/dtos";
import type { CacheService, SharpService } from "@/services";
import type {
  MediaConversionType,
  MediaJobData,
  StorageProvider,
} from "@/types";
import { MongoUtils } from "@/utils";
import { Job, Worker } from "bullmq";
import type { FastifyBaseLogger } from "fastify";
import type { ObjectId } from "mongodb";

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

  private convert(
    type: MediaConversionType,
    buffer: Buffer,
    fit?: StickerFit,
  ): Promise<Buffer> {
    switch (type) {
      case "animated":
        return this.sharpService.convertToAnimated(buffer, { fit });
      case "avatar":
        return this.sharpService.convertToAvatar(buffer);
      case "banner":
        return this.sharpService.convertToBanner(buffer);
      default:
        return this.sharpService.convertToStatic(buffer, { fit });
    }
  }

  private async savePackCoverAndIcon(
    packObjectId: ObjectId,
    userObjectId: ObjectId,
    packId: string,
    inputBuffer: Buffer,
    isAnimated: boolean,
  ): Promise<void> {
    const { icon, cover } = await this.sharpService.convertToStickerPackIcon(
      inputBuffer,
      { isAnimated },
    );

    const iconKey = `packs/${packId}/icon.webp`;
    const coverKey = `packs/${packId}/cover.webp`;

    await Promise.all([
      this.storageProvider.uploadFile(iconKey, icon, {
        contentType: "image/webp",
        cacheControl: "public, max-age=31536000, immutable",
      }),
      this.storageProvider.uploadFile(coverKey, cover, {
        contentType: "image/webp",
        cacheControl: "public, max-age=31536000, immutable",
      }),
    ]);

    await this.packRepository.update(packObjectId, userObjectId, {
      icon_url: this.storageProvider.getPublicUrl(iconKey),
      icon_file_key: iconKey,
      cover_url: this.storageProvider.getPublicUrl(coverKey),
      cover_file_key: coverKey,
    });
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
      fit,
    } = job.data;
    this.logger?.info(
      { jobId: job.id, type, stickerId, packId, fit },
      "[MediaWorker] Processando conversão",
    );

    const inputBuffer = await this.getBuffer(job.data);
    const userObjectId = userId ? MongoUtils.toObjectId(userId) : undefined;
    const packObjectId = packId ? MongoUtils.toObjectId(packId) : undefined;

    const finalBuffer = await this.convert(type, inputBuffer, fit);

    let finalKey = destinationPath;
    if (!finalKey) {
      switch (type) {
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

    if (packObjectId && userObjectId && packId) {
      const pack = await this.packRepository.findById(packObjectId);
      if (pack && (!pack.icon_url || !pack.cover_url || isPackCover === true)) {
        await this.savePackCoverAndIcon(
          packObjectId,
          userObjectId,
          packId,
          inputBuffer,
          type === "animated",
        );
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
        {
          jobId: job.id,
          type: job.data.type,
          stickerId: job.data.stickerId,
          packId: job.data.packId,
        },
        `[MediaWorker] Job ${job.id} concluído com sucesso`,
      );
    });

    this.worker.on("failed", (job, err) => {
      this.logger?.error(
        {
          jobId: job?.id,
          type: job?.data?.type,
          stickerId: job?.data?.stickerId,
          packId: job?.data?.packId,
          err: err.message,
        },
        `[MediaWorker] Job ${job?.id} falhou: ${err.message}`,
      );
    });

    this.worker.on("error", (err) => {
      this.logger?.error({ err: err.message }, "[MediaWorker] Erro no worker");
    });
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
