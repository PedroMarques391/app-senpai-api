import { BullMQInitializer } from "@/init";
import type { WhatsAppJobData, WhatsAppJobResponse } from "@/types";
import { Queue, type JobsOptions } from "bullmq";

export class WhatsAppQueue {
  private readonly queue: Queue<WhatsAppJobData>;
  private readonly QUEUE_NAME = "whatsapp";
  private readonly CONNECTION = BullMQInitializer.connect();

  constructor() {
    this.queue = new Queue<WhatsAppJobData>(this.QUEUE_NAME, {
      connection: this.CONNECTION,
    });
  }

  async addJob(
    name: string,
    job: WhatsAppJobData,
    options?: JobsOptions,
  ): Promise<WhatsAppJobResponse> {
    const result = await this.queue.add(name, job, {
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
