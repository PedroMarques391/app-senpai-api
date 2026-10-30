import { BullMQInitializer } from "@/init";
import type { StickerJobData, StickerJobResponse } from "@/types";
import { Queue, type JobsOptions } from "bullmq";

export class StickerQueue {
  private readonly queue: Queue<StickerJobData>;
  private readonly QUEUE_NAME = "sticker";
  private readonly CONNECTION = BullMQInitializer.connect();

  constructor() {
    this.queue = new Queue<StickerJobData>(this.QUEUE_NAME, {
      connection: this.CONNECTION,
    });
  }

  async addJob(
    name: string,
    job: StickerJobData,
    options?: JobsOptions,
  ): Promise<StickerJobResponse> {
    const result = await this.queue.add(name, job, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
      ...options,
    });

    return {
      id: result.id,
      name: result.name,
      data: result.data,
    };
  }

  async getJob(id: string) {
    const job = await this.queue.getJob(id);

    return job;
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}
