import { ServiceFactory } from "@/factories";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

export const inventoryRoutes: FastifyPluginAsyncZod = async (app) => {
  const inventoryService = ServiceFactory.getInventoryService();

  app.get("/", async (request, reply) => {
    const items = await inventoryService.getUserInventory(request.user._id);
    return reply.status(200).send({
      success: true,
      items,
    });
  });
};
