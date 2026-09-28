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
      const statusCode = (error as any).statusCode ?? 400;
      const code: string | undefined = (error as any).code;
      return reply.status(statusCode).send({
        success: false,
        code: code ? code : "BAD_REQUEST",
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
