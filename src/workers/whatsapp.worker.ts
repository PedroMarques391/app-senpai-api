import { BullMQInitializer } from "@/init";
import type { WhatsAppJobData } from "@/queues";
import { Worker, type Job } from "bullmq";

export class WhatsAppWorker {
  private worker: Worker<WhatsAppJobData>;
  private readonly QUEUE_NAME = "whatsapp";
  private readonly PHONE_ID = process.env.WHATSAPP_PHONE_ID;
  private readonly TOKEN = process.env.WHATSAPP_TOKEN;

  constructor() {
    this.worker = new Worker<WhatsAppJobData>(
      this.QUEUE_NAME,
      this.process.bind(this),
      {
        connection: BullMQInitializer.connect(),
        concurrency: 5,
      },
    );

    this.setupListeners();
  }

  private async process(job: Job<WhatsAppJobData>): Promise<void> {
    const { number, message } = job.data;
    const url = `https://graph.facebook.com/v25.0/${this.PHONE_ID}/messages`;

    const data = {
      messaging_product: "whatsapp",
      to: number,
      type: "template",
      template: {
        name: "senpai_login_code",
        language: {
          code: "pt_BR",
        },
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: message,
              },
            ],
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [
              {
                type: "text",
                text: message,
              },
            ],
          },
        ],
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(
        `Failed to send WhatsApp message: ${responseData.error?.message || JSON.stringify(responseData)}`,
      );
    }
  }

  private setupListeners(): void {
    this.worker.on("ready", () => {
      console.log(`✅ WhatsAppWorker ready`);
    });

    this.worker.on("completed", (job) => {
      console.log(`[WhatsAppWorker] Job ${job.id} concluído com sucesso`);
    });

    this.worker.on("failed", (job, err) => {
      console.error(`[WhatsAppWorker] Job ${job?.id} falhou:`, err.message);
    });
  }

  public async close(): Promise<void> {
    await this.worker.close();
  }
}
