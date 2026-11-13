import fastify, {
  type FastifyBaseLogger,
  type FastifyServerOptions,
} from "fastify";

export class LoggerInitializer {
  private static logger: FastifyBaseLogger | null = null;

  public static getOptions(): FastifyServerOptions["logger"] {
    if (process.env.NODE_ENV === "production") {
      return true;
    }

    return {
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        },
      },
    };
  }

  public static init(logger?: FastifyBaseLogger): FastifyBaseLogger {
    if (logger) {
      this.logger = logger;
      return this.logger;
    }

    if (!this.logger) {
      this.logger = fastify({ logger: this.getOptions() }).log;
    }

    return this.logger;
  }

  public static getLogger(): FastifyBaseLogger {
    if (!this.logger) {
      throw new Error(
        "LoggerInitializer not initialized. Call LoggerInitializer.init() first.",
      );
    }

    return this.logger;
  }
}

