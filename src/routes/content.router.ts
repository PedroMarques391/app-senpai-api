import { createContentDtoSchema } from "@/dtos";
import { ServiceFactory } from "@/factories";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

export const contentRoutes: FastifyPluginAsyncZod = async (app) => {
  const contentService = ServiceFactory.getContentService();

  app.get("/", async (request, reply) => {
    return reply.status(200).send({
      message: "Content",
    });
  });

  app.post(
    "/",
    {
      preHandler: [app.requireAdmin],
      schema: { body: createContentDtoSchema },
    },
    async (request, reply) => {
      const createdBy = request.user._id;
      const content = await contentService.create(createdBy, request.body);
      return reply.status(201).send(content);
    },
  );
};
