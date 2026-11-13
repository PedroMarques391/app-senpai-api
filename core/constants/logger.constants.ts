import type { FastifyServerOptions } from "fastify";

export const FASTIFY_LOGGER_CONFIG: FastifyServerOptions["logger"] =
  process.env.NODE_ENV === "production"
    ? true
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
          },
        },
      };

