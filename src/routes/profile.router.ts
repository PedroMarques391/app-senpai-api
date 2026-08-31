import { updateUserDtoSchema } from "@/dtos";
import { ServiceFactory } from "@/factories";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

export const profileRoutes: FastifyPluginAsyncZod = async (app) => {
  const profileService = ServiceFactory.getProfileService();
  const cacheService = ServiceFactory.getCacheService(app.redis);

  app.get("/", async (request, reply) => {
    const cached = await cacheService.get(`profile:${request.user._id}`);
    if (cached) {
      return reply.status(200).send({
        success: true,
        profile: cached,
      });
    }
    const profile = await profileService.getProfile(request.user._id);
    await cacheService.set(`profile:${profile._id}`, profile, 60 * 60 * 24);
    return reply.status(200).send({
      success: true,
      profile,
    });
  });

  app.delete("/", async (request, reply) => {
    const result = await profileService.deleteProfile(request.user._id);
    await cacheService.del(`profile:${request.user._id}`);
    return reply.status(200).send({
      success: true,
      message: "Perfil deletado com sucesso",
      result,
    });
  });

  app.put(
    "/",
    {
      schema: {
        body: updateUserDtoSchema,
      },
    },
    async (request, reply) => {
      const profile = await profileService.updateProfile(
        request.user._id,
        request.body,
      );
      await cacheService.del(`profile:${profile._id}`);
      return reply.status(200).send({
        success: true,
        message: "Perfil atualizado com sucesso",
        profile,
      });
    },
  );
};
