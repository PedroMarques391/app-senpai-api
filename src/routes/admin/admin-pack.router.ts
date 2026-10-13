import {
  listPacksAdminQuerySchema,
  moderatePackDtoSchema,
} from "@/dtos";
import { ServiceFactory } from "@/factories";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z from "zod";

export const adminPackRoutes: FastifyPluginAsyncZod = async (app) => {
  const packReportService = ServiceFactory.getPackReportService(app.redis);

  app.get(
    "/",
    {
      schema: {
        querystring: listPacksAdminQuerySchema,
      },
    },
    async (request, reply) => {
      const result = await packReportService.findManyPacksForModeration(
        request.query,
      );
      return reply.status(200).send({
        success: true,
        data: result,
      });
    },
  );

  app.get(
    "/:id",
    {
      schema: {
        params: z.object({ id: z.string() }),
      },
    },
    async (request, reply) => {
      const result = await packReportService.findPackWithReports(
        request.params.id,
      );
      return reply.status(200).send({
        success: true,
        data: result,
      });
    },
  );

  app.patch(
    "/:id/moderation",
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: moderatePackDtoSchema,
      },
    },
    async (request, reply) => {
      const pack = await packReportService.moderatePack(
        request.params.id,
        request.body,
      );

      return reply.status(200).send({
        success: true,
        message: `Status de moderação do pacote atualizado para '${request.body.status}'`,
        pack,
      });
    },
  );
};
