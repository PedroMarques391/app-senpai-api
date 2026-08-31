import { getActiveContentQuerySchema } from "@/dtos";
import { ServiceFactory } from "@/factories";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

export const contentRoutes: FastifyPluginAsyncZod = async (app) => {
  const contentService = ServiceFactory.getContentService();
  const cacheService = ServiceFactory.getCacheService(app.redis);

  app.get(
    "/",
    {
      schema: {
        querystring: getActiveContentQuerySchema,
      },
    },
    async (request, reply) => {
      const cacheKey = `content:active:${request.query.type || "all"}:${request.query.platform || "all"}`;
      const cached = await cacheService.get(cacheKey);

      if (cached) {
        return reply.status(200).send({
          success: true,
          contents: cached,
        });
      }

      const contents = await contentService.findActive(request.query);
      await cacheService.set(cacheKey, contents, 60 * 60 * 24);

      return reply.status(200).send({
        success: true,
        contents,
      });
    },
  );
};
