import {
  createContentDtoSchema,
  getActiveContentQuerySchema,
  listContentAdminQuerySchema,
  updateContentDtoSchema,
} from "@/dtos";
import { ServiceFactory } from "@/factories";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z from "zod";

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

  app.get(
    "/admin",
    {
      preHandler: [app.requireAdmin],
      schema: {
        querystring: listContentAdminQuerySchema,
      },
    },
    async (request, reply) => {
      const result = await contentService.findAllAdmin(request.query);
      return reply.status(200).send({
        success: true,
        data: result,
      });
    },
  );

  app.post(
    "/",
    {
      preHandler: [app.requireAdmin],
      schema: { body: createContentDtoSchema },
    },
    async (request, reply) => {
      const createdBy = request.user._id;
      const content = await contentService.create(createdBy, request.body);
      return reply.status(201).send({
        success: true,
        message: "Conteúdo criado com sucesso",
        content,
      });
    },
  );

  app.get(
    "/:id",
    {
      preHandler: [app.requireAdmin],
      schema: { params: z.object({ id: z.string() }) },
    },
    async (request, reply) => {
      const content = await contentService.findById(request.params.id);
      return reply.status(200).send({
        success: true,
        content,
      });
    },
  );

  app.put(
    "/:id",
    {
      preHandler: [app.requireAdmin],
      schema: {
        params: z.object({ id: z.string() }),
        body: updateContentDtoSchema,
      },
    },
    async (request, reply) => {
      const content = await contentService.update(
        request.params.id,
        request.body,
      );
      return reply.status(200).send({
        success: true,
        message: "Conteúdo atualizado com sucesso",
        content,
      });
    },
  );

  app.delete(
    "/:id",
    {
      preHandler: [app.requireAdmin],
      schema: { params: z.object({ id: z.string() }) },
    },
    async (request, reply) => {
      await contentService.delete(request.params.id);
      return reply.status(200).send({
        success: true,
        message: "Conteúdo removido com sucesso",
      });
    },
  );
};
