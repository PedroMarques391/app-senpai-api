import { EmailQueue, WhatsAppQueue } from "@/queues";

export class QueueFactory {
  private static whatsappQueue: WhatsAppQueue;
  private static emailQueue: EmailQueue;

  static getWhatsAppQueue(): WhatsAppQueue {
    if (!this.whatsappQueue) {
      this.whatsappQueue = new WhatsAppQueue();
    }
    return this.whatsappQueue;
  }

  static getEmailQueue(): EmailQueue {
    if (!this.emailQueue) {
      this.emailQueue = new EmailQueue();
    }
    return this.emailQueue;
  }
}
