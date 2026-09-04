import { termsDtoSchema } from "@/dtos";
import { ServiceFactory } from "@/factories";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

export const termsRoutes: FastifyPluginAsyncZod = async (app) => {
  const termsService = ServiceFactory.getTermsService();
  const cacheService = ServiceFactory.getCacheService(app.redis);

  app.post(
    "/",
    {
      schema: {
        body: termsDtoSchema,
      },
    },
    async (request, reply) => {
      const user = await termsService.acceptTerms(request.user._id);

      await cacheService.del(`profile:${request.user._id}`);

      return reply.status(200).send({
        success: true,
        message: "Termos aceitos com sucesso",
        user,
      });
    },
  );

  app.put(
    "/",
    {
      schema: {
        body: termsDtoSchema,
      },
    },
    async (request, reply) => {
      const user = await termsService.acceptTerms(request.user._id);

      await cacheService.del(`profile:${request.user._id}`);

      return reply.status(200).send({
        success: true,
        message: "Termos aceitos com sucesso",
        user,
      });
    },
  );

  app.delete("/", async (request, reply) => {
    const user = await termsService.removeTermsAcceptance(request.user._id);

    await cacheService.del(`profile:${request.user._id}`);

    return reply.status(200).send({
      success: true,
      message: "Aceite dos termos removido com sucesso",
      user,
    });
  });

  app.post(
    "/legal-acceptance",
    {
      schema: {
        body: termsDtoSchema,
      },
    },
    async (request, reply) => {
      const user = await termsService.acceptTerms(request.user._id);

      await cacheService.del(`profile:${request.user._id}`);

      return reply.status(200).send({
        success: true,
        message: "Termos aceitos com sucesso",
        user,
      });
    },
  );

  app.put(
    "/legal-acceptance",
    {
      schema: {
        body: termsDtoSchema,
      },
    },
    async (request, reply) => {
      const user = await termsService.acceptTerms(request.user._id);

      await cacheService.del(`profile:${request.user._id}`);

      return reply.status(200).send({
        success: true,
        message: "Termos aceitos com sucesso",
        user,
      });
    },
  );

  app.delete("/legal-acceptance", async (request, reply) => {
    const user = await termsService.removeTermsAcceptance(request.user._id);

    await cacheService.del(`profile:${request.user._id}`);

    return reply.status(200).send({
      success: true,
      message: "Aceite dos termos removido com sucesso",
      user,
    });
  });
};
