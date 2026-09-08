import { commitQuotaDtoSchema, reservePackDtoSchema } from "@/schemas";
import { ServiceFactory } from "@/factories";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

export const creationQuotaRoutes: FastifyPluginAsyncZod = async (app) => {
  const creationQuotaService = ServiceFactory.getCreationQuotaService();

  app.get("/", async (request, reply) => {
    const isVip = request.user.premium === true;
    const quota = await creationQuotaService.getQuota(request.user._id, isVip);
    return reply.status(200).send({
      success: true,
      quota,
    });
  });

  app.post(
    "/reserve-pack",
    {
      schema: {
        body: reservePackDtoSchema,
      },
    },
    async (request, reply) => {
      const isVip = request.user.premium === true;
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
      const isVip = request.user.premium === true;
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
