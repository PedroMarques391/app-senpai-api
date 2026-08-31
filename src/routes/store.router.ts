import { createStoreItemDtoSchema, updateStoreItemDtoSchema } from "@/dtos";
import { ServiceFactory } from "@/factories";
import { storeItemStatusEnum } from "@/schemas";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z from "zod";

export const storeRoutes: FastifyPluginAsyncZod = async (app) => {
  const storeService = ServiceFactory.getStoreService();
  const purchaseService = ServiceFactory.getPurchaseService();
  const cacheService = ServiceFactory.getCacheService(app.redis);

  app.get(
    "/",
    {
      schema: {
        querystring: z.object({
          status: storeItemStatusEnum.optional(),
        }),
      },
    },
    async (request, reply) => {
      const cacheKey = `store:items:${request.query.status || "all"}`;
      const cached = await cacheService.get(cacheKey);

      if (cached) {
        return reply.status(200).send({ success: true, items: cached });
      }

      const items = await storeService.findManyStoreItems(request.query.status);
      await cacheService.set(cacheKey, items, 60 * 60 * 24);

      return reply.status(200).send({ success: true, items });
    },
  );

  app.get(
    "/:id",
    { schema: { params: z.object({ id: z.string() }) } },
    async (request, reply) => {
      const cacheKey = `store:item:${request.params.id}`;
      const cached = await cacheService.get(cacheKey);

      if (cached) {
        return reply.status(200).send({ success: true, item: cached });
      }

      const item = await storeService.findStoreItemById(request.params.id);
      if (item) {
        await cacheService.set(cacheKey, item, 60 * 60 * 24);
      }

      return reply.status(200).send({ success: true, item });
    },
  );

  app.post(
    "/:id/purchase",
    { schema: { params: z.object({ id: z.string() }) } },
    async (request, reply) => {
      const item = await purchaseService.execute(
        request.user._id,
        request.params.id,
      );

      await Promise.all([
        cacheService.del(`inventory:${request.user._id}`),
        cacheService.del(`profile:${request.user._id}`),
      ]);

      return reply.status(200).send({
        success: true,
        message: "Item adquirido com sucesso",
        item,
      });
    },
  );

  app.post(
    "/",
    {
      preHandler: [app.requireAdmin()],
      schema: { body: createStoreItemDtoSchema },
    },
    async (request, reply) => {
      const item = await storeService.createStoreItem(request.body);
      await cacheService.delPattern("store:items:*");

      return reply.status(201).send({
        success: true,
        message: "Item criado com sucesso",
        item,
      });
    },
  );

  app.put(
    "/:id",
    {
      preHandler: [app.requireAdmin()],
      schema: {
        params: z.object({ id: z.string() }),
        body: updateStoreItemDtoSchema,
      },
    },
    async (request, reply) => {
      const item = await storeService.updateStoreItem(
        request.params.id,
        request.body,
      );

      await Promise.all([
        cacheService.delPattern("store:items:*"),
        cacheService.del(`store:item:${request.params.id}`),
      ]);

      return reply.status(200).send({
        success: true,
        message: "Item atualizado com sucesso",
        item,
      });
    },
  );

  app.delete(
    "/:id",
    {
      preHandler: [app.requireAdmin()],
      schema: { params: z.object({ id: z.string() }) },
    },
    async (request, reply) => {
      await storeService.deleteStoreItem(request.params.id);

      await Promise.all([
        cacheService.delPattern("store:items:*"),
        cacheService.del(`store:item:${request.params.id}`),
      ]);

      return reply.status(200).send({
        success: true,
        message: "Item removido com sucesso",
      });
    },
  );
};
