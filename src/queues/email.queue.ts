import { BullMQInitializer } from "@/init";
import { Queue } from "bullmq";

export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
}

export interface EmailJobResponse {
  id?: string;
  name: string;
  data: EmailJobData;
}

export class EmailQueue {
  private readonly queue: Queue<EmailJobData>;
  private readonly QUEUE_NAME = "email";
  private readonly CONNECTION = BullMQInitializer.connect();

  constructor() {
    this.queue = new Queue<EmailJobData>(this.QUEUE_NAME, {
      connection: this.CONNECTION,
    });
  }

  async addJob(name: string, job: EmailJobData): Promise<EmailJobResponse> {
    const result = await this.queue.add(name, job);

    return {
      id: result.id,
      name: result.name,
      data: result.data,
    };
  }

  async getQueue(id: string) {
    return await this.queue.getJob(id);
  }
}
