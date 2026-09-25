import type { EmailQueue } from "@/queues";
import type { EmailJobData } from "@/types";

export class MailService {
  constructor(private readonly emailQueue: EmailQueue) {}

  async sendMail(data: EmailJobData): Promise<void> {
    await this.emailQueue.addJob(
      "send-email",
      {
        to: data.to,
        subject: data.subject,
        html: data.html,
        from: data.from,
        replyTo: data.replyTo,
      },
      { attempts: 2 },
    );
  }
}
