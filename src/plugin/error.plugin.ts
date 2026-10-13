import { AppError } from "@/errors";
import type { FastifyPluginAsync } from "fastify";
import { ZodError } from "zod";

export const errorPlugin: FastifyPluginAsync = async (app) => {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        message: "Dados de requisição inválidos",
        errors: error.flatten().fieldErrors,
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
