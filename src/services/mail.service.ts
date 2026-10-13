import type { EmailQueue } from "@/queues";
import type { EmailJobData } from "@/types";
import type { JobsOptions } from "bullmq";

export class MailService {
  constructor(private readonly emailQueue: EmailQueue) {}

  async sendMail(data: EmailJobData, options?: JobsOptions): Promise<void> {
    await this.emailQueue.addJob(
      "send-email",
      {
        to: data.to,
        subject: data.subject,
        html: data.html,
        text: data.text,
        from: data.from,
        replyTo: data.replyTo,
      },
      {
        attempts: 2,
        ...options,
      },
    );
  }
}
