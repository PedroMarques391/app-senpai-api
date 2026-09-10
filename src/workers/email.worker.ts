import { BullMQInitializer } from "@/init";
import type { EmailJobData } from "@/queues";
import { renderOtpEmailTemplate } from "@/templates";
import type { FastifyBaseLogger } from "fastify";
import { Worker, type Job } from "bullmq";
import type { Mail, SMTPSentMessageInfo } from "nodemailer";

export class EmailWorker {
  private worker: Worker<EmailJobData>;
  private readonly QUEUE_NAME = "email";
  private readonly FROM =
    process.env.SMTP_FROM ?? `"Senpai" <${process.env.SMTP_USER}>`;

  constructor(
    private readonly transporter: Mail<SMTPSentMessageInfo>,
    private readonly logger?: FastifyBaseLogger,
  ) {
    this.worker = new Worker<EmailJobData>(
      this.QUEUE_NAME,
      this.process.bind(this),
      {
        connection: BullMQInitializer.connect(),
        concurrency: 5,
      },
    );

    this.setupListeners();
  }

  private async process(job: Job<EmailJobData>): Promise<void> {
    const { to, subject, userName, body } = job.data;

    const html = renderOtpEmailTemplate({
      otp: body,
      userName,
    });

    await this.transporter.sendMail({
      from: this.FROM,
      to,
      subject,
      html,
    });
  }

  private setupListeners(): void {
    this.worker.on("ready", () => {
      this.logger?.info("EmailWorker ready");
    });

    this.worker.on("completed", (job) => {
      this.logger?.info(
        { jobId: job.id },
        `[EmailWorker] Job ${job.id} concluído com sucesso`,
      );
    });

    this.worker.on("failed", (job, err) => {
      this.logger?.error(
        { jobId: job?.id, err: err.message },
        `[EmailWorker] Job ${job?.id} falhou: ${err.message}`,
      );
    });
  }

  public async close(): Promise<void> {
    await this.worker.close();
  }
}

