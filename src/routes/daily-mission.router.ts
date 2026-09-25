import { ServiceFactory } from "@/factories";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

export const dailyMissionRoutes: FastifyPluginAsyncZod = async (app) => {
  const dailyMissionService = ServiceFactory.getDailyMissionService();
  const cacheService = ServiceFactory.getCacheService(app.redis);

  app.get("/daily", async (request, reply) => {
    const overview = await dailyMissionService.getDailyOverview(
      request.user._id,
    );
    return reply.status(200).send({
      success: true,
      ...overview,
    });
  });

  app.post(
    "/:id/claim",
    {
      schema: {
        params: z.object({ id: z.string() }),
      },
    },
    async (request, reply) => {
      const result = await dailyMissionService.claimMissionReward(
        request.user._id,
        request.params.id,
      );

      await Promise.all([
        cacheService.del(`profile:${request.user._id}`),
        request.user.userName
          ? cacheService.del(`profile:username:${request.user.userName}`)
          : Promise.resolve(),
      ]);

      return reply.status(200).send({
        success: true,
        message: "Recompensa resgatada com sucesso!",
        ...result,
      });
    },
  );
};
