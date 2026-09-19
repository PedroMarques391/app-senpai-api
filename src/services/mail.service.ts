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
      },
      { attempts: 2 },
    );
  }
}
