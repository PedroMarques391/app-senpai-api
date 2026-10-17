import {
  listPacksAdminQuerySchema,
  moderatePackDtoSchema,
} from "@/dtos";
import { ServiceFactory } from "@/factories";
import type { PackModerationAction } from "@/schemas";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z from "zod";

const ACTION_TEXT_MAP: Record<PackModerationAction, string> = {
  APPROVE: "aprovado",
  RESTRICT: "restrito",
  BAN: "banido",
  DELETE_WITH_STRIKE: "deletado",
  DELETE_NO_STRIKE: "deletado",
};


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
      const result = await packReportService.moderatePack(
        request.params.id,
        request.body,
        request.user,
      );

      const actionText = ACTION_TEXT_MAP[result.action];

      return reply.status(200).send({
        success: true,
        message: `Pacote ${actionText} com sucesso`,
        action: result.action,
        pack: result.pack,
        deleted: result.deleted ?? false,
      });
    },
  );
};
