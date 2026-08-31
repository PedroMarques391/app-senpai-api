import { getActiveContentQuerySchema } from "@/dtos";
import { ServiceFactory } from "@/factories";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

export const contentRoutes: FastifyPluginAsyncZod = async (app) => {
  const contentService = ServiceFactory.getContentService();

  app.get(
    "/",
    {
      schema: {
        querystring: getActiveContentQuerySchema,
      },
    },
    async (request, reply) => {
      const contents = await contentService.findActive(request.query);
      return reply.status(200).send({
        success: true,
        contents,
      });
    },
  );
};
