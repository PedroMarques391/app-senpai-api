import { EmailQueue, StickerQueue, WhatsAppQueue } from "@/queues";

export class QueueFactory {
  private static whatsappQueue: WhatsAppQueue;
  private static emailQueue: EmailQueue;
  private static stickerQueue: StickerQueue;

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

  static getStickerQueue(): StickerQueue {
    if (!this.stickerQueue) {
      this.stickerQueue = new StickerQueue();
    }
    return this.stickerQueue;
  }
}

