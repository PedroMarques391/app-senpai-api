import {
  listGroupsAdminQuerySchema,
  moderateGroupDtoSchema,
} from "@/dtos";
import { ServiceFactory } from "@/factories";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z from "zod";

export const adminGroupRoutes: FastifyPluginAsyncZod = async (app) => {
  const groupService = ServiceFactory.getGroupService(app.redis);

  app.get(
    "/",
    {
      schema: {
        querystring: listGroupsAdminQuerySchema,
      },
    },
    async (request, reply) => {
      const result = await groupService.findManyGroupsForModeration(
        request.query,
      );
      return reply.status(200).send({
        success: true,
        data: result,
      });
    },
  );

  app.patch(
    "/:groupId/items/:itemId/moderation",
    {
      schema: {
        params: z.object({
          groupId: z.string(),
          itemId: z.string(),
        }),
        body: moderateGroupDtoSchema,
      },
    },
    async (request, reply) => {
      const result = await groupService.moderateGroupItem(
        request.params.groupId,
        request.params.itemId,
        request.body,
        request.user,
      );

      const actionText =
        request.body.action === "accepted" ? "aprovado" : "rejeitado";

      return reply.status(200).send({
        success: true,
        message: `Grupo ${result.item.title} ${actionText} com sucesso`,
        data: {
          groupId: result.group._id.toString(),
          itemId: result.item.id,
          status: result.item.status,
          decidedAt: result.item.decided_at,
        },
      });
    },
  );
};
