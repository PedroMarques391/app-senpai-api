import { completeRegistrationDtoSchema, updateUserDtoSchema } from "@/dtos";
import { ServiceFactory } from "@/factories";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z from "zod";

export const profileRoutes: FastifyPluginAsyncZod = async (app) => {
  const profileService = ServiceFactory.getProfileService();
  const cacheService = ServiceFactory.getCacheService(app.redis);

  app.get("/", async (request, reply) => {
    const cacheKey = `profile:${request.user._id}`;
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      return reply.status(200).send({
        success: true,
        profile: cached,
      });
    }

    const profile = await profileService.getProfile(request.user._id);
    await cacheService.set(cacheKey, profile, 60 * 60 * 24);

    return reply.status(200).send({
      success: true,
      profile,
    });
  });

  app.get(
    "/:username",
    {
      schema: {
        params: z.object({
          username: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const cacheKey = `profile:username:${request.params.username}`;
      const cached = await cacheService.get(cacheKey);

      if (cached) {
        return reply.status(200).send({
          success: true,
          profile: cached,
        });
      }

      const profile = await profileService.getProfileByUsername(
        request.params.username,
      );

      if (profile) {
        await cacheService.set(cacheKey, profile, 60 * 60 * 24);
      }

      return reply.status(200).send({
        success: true,
        profile,
      });
    },
  );

  app.patch(
    "/complete-registration",
    {
      schema: {
        body: completeRegistrationDtoSchema,
      },
    },
    async (request, reply) => {
      const profile = await profileService.completeRegistration(
        request.user._id,
        request.body,
      );

      await Promise.all([
        cacheService.del(`profile:${request.user._id}`),
        cacheService.del(`profile:username:${profile.userName}`),
      ]);

      return reply.status(200).send({
        success: true,
        message: "Cadastro finalizado com sucesso",
        profile,
      });
    },
  );

  app.delete("/", async (request, reply) => {
    const result = await profileService.deleteProfile(request.user._id);

    await Promise.all([
      cacheService.del(`profile:${request.user._id}`),
      cacheService.del(`profile:username:${result.userName}`),
    ]);

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

      await Promise.all([
        cacheService.del(`profile:${request.user._id}`),
        cacheService.del(`profile:username:${profile.userName}`),
      ]);

      return reply.status(200).send({
        success: true,
        message: "Perfil atualizado com sucesso",
        profile,
      });
    },
  );
};
