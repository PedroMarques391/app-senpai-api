import { ZodError } from "zod";
import type { FastifyPluginAsync } from "fastify";

export const errorPlugin: FastifyPluginAsync = async (app) => {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        message: "Dados de requisição inválidos",
        errors: error.flatten().fieldErrors,
      });
    }

    if (error instanceof Error) {
      return reply.status(400).send({
        success: false,
        message: error.message,
      });
    }

    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: "Erro interno do servidor",
    });
  });
};
