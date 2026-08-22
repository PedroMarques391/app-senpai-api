import { updateUserDtoSchema } from "@/dtos";
import { ServiceFactory } from "@/factories";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

export const profileRoutes: FastifyPluginAsyncZod = async (app) => {
  const profileService = ServiceFactory.getProfileService();

  app.get("/", async (request, reply) => {
    const profile = await profileService.getProfile(request.user._id);
    return reply.status(200).send({
      success: true,
      profile,
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
};
