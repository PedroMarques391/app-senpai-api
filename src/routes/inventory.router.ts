import { ServiceFactory } from "@/factories";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

export const inventoryRoutes: FastifyPluginAsyncZod = async (app) => {
  const inventoryService = ServiceFactory.getInventoryService();
  const cacheService = ServiceFactory.getCacheService(app.redis);

  app.get("/", async (request, reply) => {
    const cacheKey = `inventory:${request.user._id}`;
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      return reply.status(200).send({
        success: true,
        items: cached,
      });
    }

    const items = await inventoryService.getUserInventory(request.user._id);
    await cacheService.set(cacheKey, items, 60 * 60 * 24);

    return reply.status(200).send({
      success: true,
      items,
    });
  });
};
