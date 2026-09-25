import { ResendEmailProvider } from "@/providers";
import type { EmailProvider } from "@/types";
import type { FastifyBaseLogger } from "fastify";

export class MailerInitializer {
  private static provider: EmailProvider | null = null;
  private static logger?: FastifyBaseLogger;

  public static init(logger?: FastifyBaseLogger): void {
    if (logger) {
      this.logger = logger;
    }

    if (this.provider) {
      return;
    }

    this.provider = new ResendEmailProvider();
    this.logger?.info("EmailProvider initialized successfully");
  }

  public static getProvider(): EmailProvider {
    if (!this.provider) {
      throw new Error(
        "MailerInitializer not initialized. Call MailerInitializer.init() first.",
      );
    }
    return this.provider;
  }
}
