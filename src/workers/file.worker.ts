import { AppError } from "@/errors";
import { BullMQInitializer } from "@/init";
import { PackRepository, StickerRepository } from "@/repositories";
import type { CacheService, SharpService } from "@/services";
import type {
  StickerConversionType,
  StickerJobData,
  StorageProvider,
} from "@/types";
import { MongoUtils } from "@/utils";
import { Job, Worker } from "bullmq";
import type { FastifyBaseLogger } from "fastify";

export class FileWorker {
  private worker: Worker<StickerJobData>;
  private readonly QUEUE_NAME = "sticker";

  constructor(
    private readonly storageProvider: StorageProvider,
    private readonly sharpService: SharpService,
    private readonly stickerRepository: StickerRepository,
    private readonly packRepository: PackRepository,
    private readonly cacheService: CacheService,
    private readonly logger?: FastifyBaseLogger,
  ) {
    this.worker = new Worker<StickerJobData>(
      this.QUEUE_NAME,
      this.process.bind(this),
      {
        connection: BullMQInitializer.connect(),
        concurrency: 5,
      },
    );

    this.setupListeners();
  }

  private async getBuffer(job: StickerJobData): Promise<Buffer> {
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
    type: StickerConversionType,
    buffer: Buffer,
  ): Promise<Buffer> {
    switch (type) {
      case "animated":
        return this.sharpService.convertToAnimated(buffer);
      case "pack_icon":
        return this.sharpService.convertToStickerPackIcon(buffer);
      default:
        return this.sharpService.convertToStatic(buffer);
    }
  }

  private async process(job: Job<StickerJobData>): Promise<void> {
    const { type, packId, stickerId, userId, destinationPath, tempKey } =
      job.data;
    this.logger?.info(
      { jobId: job.id, type, stickerId, packId },
      "[FileWorker] Processando conversão",
    );

    const inputBuffer = await this.getBuffer(job.data);
    const finalBuffer = await this.convert(type, inputBuffer);

    const finalKey =
      destinationPath ??
      (type === "pack_icon"
        ? `packs/${packId}/icon.webp`
        : `stickers/${packId}/${stickerId}.webp`);

    await this.storageProvider.uploadFile(finalKey, finalBuffer, {
      contentType: "image/webp",
    });

    const publicUrl = this.storageProvider.getPublicUrl(finalKey);

    const userObjectId = MongoUtils.toObjectId(userId);
    const packObjectId = MongoUtils.toObjectId(packId);

    if (type === "pack_icon") {
      await this.packRepository.update(packObjectId, userObjectId, {
        icon_url: publicUrl,
        icon_file_key: finalKey,
      });
    }

    if (stickerId) {
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

    if (packId && type !== "pack_icon") {
      const pack = await this.packRepository.findById(packObjectId);
      if (pack && !pack.icon_url) {
        const iconBuffer =
          await this.sharpService.convertToStickerPackIcon(inputBuffer);
        const iconKey = `packs/${packId}/icon.webp`;
        await this.storageProvider.uploadFile(iconKey, iconBuffer, {
          contentType: "image/webp",
        });
        const iconUrl = this.storageProvider.getPublicUrl(iconKey);
        await this.packRepository.update(packObjectId, userObjectId, {
          icon_url: iconUrl,
          icon_file_key: iconKey,
        });
      }
    }

    if (tempKey) {
      await this.storageProvider.deleteFile(tempKey).catch((err) => {
        this.logger?.warn(
          { tempKey, err: err?.message },
          "[FileWorker] Falha ao excluir arquivo temporário",
        );
      });
    }

    await Promise.allSettled([
      this.cacheService.del(`pack:${packId}`),
      this.cacheService.del(`stickers:pack:${packId}`),
      this.cacheService.del(`pack:user:${userId}`),
    ]);

    this.logger?.info(
      { jobId: job.id, finalKey, publicUrl },
      "[FileWorker] Conversão finalizada com sucesso",
    );
  }

  private setupListeners(): void {
    this.worker.on("ready", () => {
      this.logger?.info("FileWorker pronto para processar jobs");
    });

    this.worker.on("completed", (job) => {
      this.logger?.info(
        { jobId: job.id },
        `[FileWorker] Job ${job.id} concluído com sucesso`,
      );
    });

    this.worker.on("failed", (job, err) => {
      this.logger?.error(
        { jobId: job?.id, err: err.message },
        `[FileWorker] Job ${job?.id} falhou: ${err.message}`,
      );
    });
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
