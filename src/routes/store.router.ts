import { createStoreItemDtoSchema, updateStoreItemDtoSchema } from "@/dtos";
import { ServiceFactory } from "@/factories";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z from "zod";

export const storeRoutes: FastifyPluginAsyncZod = async (app) => {
  const storeService = ServiceFactory.getStoreService();

  const verifyAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.user.role !== "admin") {
      return reply.status(403).send({
        success: false,
        message: "Acesso negado. Requer privilégios de administrador.",
      });
    }
  };

  app.get("/", async (request, reply) => {
    const items = await storeService.listItems();
    return reply.status(200).send({ success: true, items });
  });

  app.get(
    "/:id",
    { schema: { params: z.object({ id: z.string() }) } },
    async (request, reply) => {
      const item = await storeService.getItem(request.params.id);
      return reply.status(200).send({ success: true, item });
    },
  );

  app.post(
    "/:id/purchase",
    { schema: { params: z.object({ id: z.string() }) } },
    async (request, reply) => {
      const item = await storeService.purchaseItem(
        request.user._id,
        request.params.id,
      );
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
      preHandler: [verifyAdmin],
      schema: { body: createStoreItemDtoSchema },
    },
    async (request, reply) => {
      const item = await storeService.createItem(request.body);
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
      preHandler: [verifyAdmin],
      schema: {
        params: z.object({ id: z.string() }),
        body: updateStoreItemDtoSchema,
      },
    },
    async (request, reply) => {
      const item = await storeService.updateItem(
        request.params.id,
        request.body,
      );
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
      preHandler: [verifyAdmin],
      schema: { params: z.object({ id: z.string() }) },
    },
    async (request, reply) => {
      await storeService.deleteItem(request.params.id);
      return reply.status(200).send({
        success: true,
        message: "Item removido com sucesso",
      });
    },
  );
};
