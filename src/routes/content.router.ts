import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

export const contentRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/", { preHandler: [app.requireAdmin] }, async (request, reply) => {
    return reply.status(200).send({
      message: "Content",
    });
  });
};
