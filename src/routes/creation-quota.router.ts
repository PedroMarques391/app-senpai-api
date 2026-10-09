import { ServiceFactory } from "@/factories";
import type { User } from "@/models";
import { commitQuotaDtoSchema, reservePackDtoSchema } from "@/schemas";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

export const creationQuotaRoutes: FastifyPluginAsyncZod = async (app) => {
  const creationQuotaService = ServiceFactory.getCreationQuotaService();
  const profileService = ServiceFactory.getProfileService();
  const cacheService = ServiceFactory.getCacheService(app.redis);

  const resolveIsVip = async (userId: string): Promise<boolean> => {
    const cacheKey = `profile:${userId}`;
    let profile = await cacheService.get<User>(cacheKey);
    if (!profile) {
      profile = await profileService.getProfile(userId);
      if (profile) {
        await cacheService.set(cacheKey, profile, 60 * 60 * 24);
      }
    }
    return profile?.premium === true;
  };

  app.get("/", async (request, reply) => {
    const isVip = await resolveIsVip(request.user._id);
    const quota = await creationQuotaService.getQuota(request.user._id, isVip);
    return reply.status(200).send({
      success: true,
      quota,
    });
  });

  app.post(
    "/reserve-pack",
    {
      preHandler: [app.requireVerifiedEmail],
      schema: {
        body: reservePackDtoSchema,
      },
    },
    async (request, reply) => {
      const isVip = await resolveIsVip(request.user._id);
      try {
        const quota = await creationQuotaService.reservePack(
          request.user._id,
          request.body.packName,
          isVip,
        );
        return reply.status(200).send({
          success: true,
          quota,
        });
      } catch (error: any) {
        return reply.status(403).send({
          success: false,
          code: "QUOTA_EXCEEDED",
          message: error.message || "Não foi possível reservar o pack hoje",
        });
      }
    },
  );

  app.post(
    "/commit",
    {
      schema: {
        body: commitQuotaDtoSchema,
      },
    },
    async (request, reply) => {
      const isVip = await resolveIsVip(request.user._id);
      try {
        const quota = await creationQuotaService.commit(
          request.user._id,
          request.body.packName,
          request.body.stickerCount,
          isVip,
        );
        return reply.status(200).send({
          success: true,
          message: "Cota atualizada com sucesso",
          quota,
        });
      } catch (error: any) {
        return reply.status(403).send({
          success: false,
          code: "QUOTA_EXCEEDED",
          message: error.message || "Erro ao registrar cota",
        });
      }
    },
  );
};
