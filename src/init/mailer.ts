import type { FastifyBaseLogger } from "fastify";
import nodemailer, { type Mail, type SMTPSentMessageInfo } from "nodemailer";

export class MailerInitializer {
  private static transporter: Mail<SMTPSentMessageInfo> | null = null;
  private static logger?: FastifyBaseLogger;

  public static async init(logger?: FastifyBaseLogger): Promise<void> {
    if (logger) {
      this.logger = logger;
    }

    if (this.transporter) {
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    try {
      await this.transporter.verify();
      this.logger?.info("Mailer is ready to send messages");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : JSON.stringify(err);
      this.logger?.warn(
        { err },
        `Mailer failed to verify SMTP connection: ${errorMessage}. Proceeding without crashing startup...`,
      );
    }
  }

  public static getTransporter(): Mail<SMTPSentMessageInfo> {
    if (!this.transporter) {
      throw new Error(
        "MailerInitializer not initialized. Call MailerInitializer.init() first.",
      );
    }
    return this.transporter;
  }

  public static close(): void {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
    }
  }
}

