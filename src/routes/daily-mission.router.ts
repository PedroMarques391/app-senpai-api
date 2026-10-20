import {
  claimAchievementParamsDtoSchema,
  claimMissionParamsDtoSchema,
  syncAchievementsDtoSchema,
} from "@/dtos";
import { ServiceFactory } from "@/factories";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

export const dailyMissionRoutes: FastifyPluginAsyncZod = async (app) => {
  const dailyMissionService = ServiceFactory.getDailyMissionService();
  const profileService = ServiceFactory.getProfileService(app.redis);

  app.get("/daily", async (request, reply) => {
    const overview = await dailyMissionService.getDailyOverview(
      request.user._id,
    );

    await profileService.invalidateProfile(
      request.user._id,
      request.user.userName,
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
        params: claimMissionParamsDtoSchema,
      },
    },
    async (request, reply) => {
      const result = await dailyMissionService.claimMissionReward(
        request.user._id,
        request.params.id,
      );

      await profileService.invalidateProfile(
        request.user._id,
        request.user.userName,
      );

      return reply.status(200).send({
        success: true,
        message: "Recompensa resgatada com sucesso!",
        ...result,
      });
    },
  );

  app.post(
    "/achievements/:id/claim",
    {
      schema: {
        params: claimAchievementParamsDtoSchema,
      },
    },
    async (request, reply) => {
      const result = await dailyMissionService.claimAchievementReward(
        request.user._id,
        request.params.id,
      );

      await profileService.invalidateProfile(
        request.user._id,
        request.user.userName,
      );

      return reply.status(200).send({
        success: true,
        message: "Conquista resgatada com sucesso!",
        ...result,
      });
    },
  );

  app.post(
    "/achievements/sync",
    {
      schema: {
        body: syncAchievementsDtoSchema,
      },
    },
    async (request, reply) => {
      const result = await dailyMissionService.syncAchievements(
        request.user._id,
        request.body.achievement_ids,
      );

      await profileService.invalidateProfile(
        request.user._id,
        request.user.userName,
      );

      return reply.status(200).send({
        success: true,
        ...result,
      });
    },
  );
};
