import {
  completeRegistrationDtoSchema,
  updateEquippedCosmeticsDtoSchema,
  updateUserDtoSchema,
} from "@/dtos";
import { ServiceFactory } from "@/factories";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z from "zod";

export const profileRoutes: FastifyPluginAsyncZod = async (app) => {
  const profileService = ServiceFactory.getProfileService(app.redis);
  const otpService = ServiceFactory.getOtpService(app.redis);
  const followsService = ServiceFactory.getFollowsService(app.redis);

  app.get("/", async (request, reply) => {
    const profile = await profileService.getProfile(request.user._id);

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
          username: z.string().trim().toLowerCase(),
        }),
      },
    },
    async (request, reply) => {
      const profile = await profileService.getProfileByUsername(
        request.params.username,
      );

      return reply.status(200).send({
        success: true,
        profile,
      });
    },
  );

  app.get(
    "/:username/social-summary",
    {
      schema: {
        params: z.object({
          username: z.string().trim().toLowerCase(),
        }),
      },
    },
    async (request, reply) => {
      const result = await followsService.getSocialSummary(
        request.params.username,
        request.user?._id,
      );

      return reply.status(200).send(result);
    },
  );

  app.post(
    "/:username/follow",
    {
      schema: {
        params: z.object({
          username: z.string().trim().toLowerCase(),
        }),
      },
    },
    async (request, reply) => {
      const result = await followsService.followUser(
        request.user._id,
        request.params.username,
      );

      return reply.status(200).send(result);
    },
  );

  app.delete(
    "/:username/follow",
    {
      schema: {
        params: z.object({
          username: z.string().trim().toLowerCase(),
        }),
      },
    },
    async (request, reply) => {
      const result = await followsService.unfollowUser(
        request.user._id,
        request.params.username,
      );

      return reply.status(200).send(result);
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

      return reply.status(200).send({
        success: true,
        message: "Cadastro finalizado com sucesso",
        profile,
      });
    },
  );

  app.delete("/", async (request, reply) => {
    const result = await profileService.deleteProfile(request.user._id);

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

      return reply.status(200).send({
        success: true,
        message: "Perfil atualizado com sucesso",
        profile,
      });
    },
  );

  app.patch(
    "/cosmetics",
    {
      schema: {
        body: updateEquippedCosmeticsDtoSchema,
      },
    },
    async (request, reply) => {
      const profile = await profileService.updateEquippedCosmetics(
        request.user._id,
        request.body,
      );

      return reply.status(200).send({
        success: true,
        message: "Cosméticos atualizados com sucesso",
        profile,
      });
    },
  );

  app.post(
    "/email/code/send",
    {
      schema: {
        body: z.object({
          email: z.string().trim().toLowerCase().email(),
        }),
      },
    },
    async (request, reply) => {
      const { email } = request.body;
      const result = await otpService.generateAndSendEmailOtp(email);

      if (!result.success) {
        return reply.status(403).send(result);
      }

      return reply.status(200).send({
        success: true,
        message: "Código enviado para o seu e-mail",
        expiresIn: 300,
        retryAfter: 60,
      });
    },
  );

  app.post(
    "/email/code/verify",
    {
      schema: {
        body: z.object({
          email: z.string().trim().toLowerCase().email(),
          code: z.string().length(6),
        }),
      },
    },
    async (request, reply) => {
      const { email, code } = request.body;
      const result = await otpService.verifyEmailOtp(email, code);

      await profileService.invalidateProfile(
        request.user._id,
        request.user.userName,
      );

      return reply.status(200).send(result);
    },
  );
};
