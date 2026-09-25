import type { EmailProvider, SendEmailPayload } from "@/types";
import { Resend } from "resend";

export class ResendEmailProvider implements EmailProvider {
  private readonly resend: Resend;
  private readonly defaultFrom: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    const from =
      process.env.RESEND_FROM ?? '"Senpai" <noreply@botdosenpai.com.br>';

    if (!apiKey) {
      throw new Error("RESEND_API_KEY não definida nas variáveis de ambiente");
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
}
