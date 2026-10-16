import { AppError } from "@/errors";
import type { FastifyPluginAsync } from "fastify";
import { ZodError } from "zod";

export const errorPlugin: FastifyPluginAsync = async (app) => {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      request.log.warn(
        {
          issues: error.issues,
          url: request.url,
          method: request.method,
        },
        "Falha na validação de schema (ZodError)",
      );

      const sanitizedErrors: Record<string, string[]> = {};

      for (const issue of error.issues) {
        const field = issue.path.join(".") || "geral";
        let message = issue.message;

        if (
          issue.code === "invalid_value" ||
          message.includes("Invalid enum value") ||
          message.includes("Expected '") ||
          message.includes("Invalid value")
        ) {
          message = "Valor inválido para este campo.";
        }

        if (!sanitizedErrors[field]) {
          sanitizedErrors[field] = [];
        }
        sanitizedErrors[field].push(message);
      }

      return reply.status(400).send({
        success: false,
        message: "Dados de requisição inválidos",
        errors: sanitizedErrors,
      });
    }

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        code: error.code,
        message: error.message,
      });
    }

    request.log.error(error);
    return reply.status(500).send({
      success: false,
      code: "INTERNAL_SERVER_ERROR",
      message: "Erro interno do servidor",
    });
  });
};
