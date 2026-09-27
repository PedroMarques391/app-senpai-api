import type { EmailProvider, SendEmailPayload } from "@/types";
import { Resend, type WebhookEventPayload } from "resend";

export class ResendEmailProvider implements EmailProvider {
  private readonly resend: Resend;
  private readonly defaultFrom: string;
  private readonly webhookSecret: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    const from =
      process.env.RESEND_FROM ?? '"Senpai" <noreply@botdosenpai.com.br>';
    this.webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

    if (!apiKey) {
      throw new Error("RESEND_API_KEY não definida nas variáveis de ambiente");
    }

    if (!this.webhookSecret) {
      throw new Error("RESEND_WEBHOOK_SECRET não definida nas variáveis de ambiente");
    }

    this.resend = new Resend(apiKey);
    this.defaultFrom = from;
  }

  async send(payload: SendEmailPayload): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: payload.from ?? this.defaultFrom,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      ...(payload.replyTo ? { replyTo: payload.replyTo } : {}),
    });

    if (error) {
      throw new Error(`[Resend] Falha ao enviar e-mail: ${error.message}`);
    }
  }

  async verifyWebhook(payload: string, headers: Record<string, string>): Promise<WebhookEventPayload> {
    const result = this.resend.webhooks.verify({
      payload,
      headers: {
        id: headers.id,
        timestamp: headers.timestamp,
        signature: headers.signature,
      },
      webhookSecret: this.webhookSecret,
    });

    if (!result) {
      throw new Error(`[Resend] Falha ao verificar webhook`);
    }

    return result;
  }
}
