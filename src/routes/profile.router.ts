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
          email: z.email({ message: "E-mail inválido" }).trim().toLowerCase(),
        }),
      },
    },
    async (request, reply) => {
      const { email } = request.body;
      const result = await profileService.sendEmailVerification(
        request.user._id,
        email,
      );

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
      const result = await profileService.verifyEmail(
        request.user._id,
        email,
        code,
      );

      return reply.status(200).send(result);
    },
  );

  app.post(
    "/phone/code/send",
    {
      schema: {
        body: z.object({
          wa_id: z.string().trim().min(8, "Número de WhatsApp inválido."),
        }),
      },
    },
    async (request, reply) => {
      const { wa_id } = request.body;
      const result = await profileService.sendPhoneVerification(
        request.user._id,
        wa_id,
      );

      if (!result.success) {
        return reply.status(403).send(result);
      }

      return reply.status(200).send({
        success: true,
        message: "Código enviado para o seu WhatsApp",
        expiresIn: 300,
        retryAfter: 60,
      });
    },
  );

  app.post(
    "/phone/code/verify",
    {
      schema: {
        body: z.object({
          wa_id: z.string().trim().min(8).optional(),
          code: z.string().length(6),
        }),
      },
    },
    async (request, reply) => {
      const waId = request.body?.wa_id || request.user.wa_id;
      const { code } = request.body;

      if (!waId) {
        return reply.status(400).send({
          success: false,
          message: "Número de WhatsApp não informado.",
        });
      }

      const result = await profileService.verifyPhone(
        request.user._id,
        waId,
        code,
      );

      return reply.status(200).send(result);
    },
  );
};
