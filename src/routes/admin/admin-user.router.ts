import {
  adminAdjustPetalsDtoSchema,
  adminUpdateUserRoleDtoSchema,
  adminUpdateUserStatusDtoSchema,
  listUsersAdminQuerySchema,
} from "@/dtos";
import { ServiceFactory } from "@/factories";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z from "zod";

export const adminUserRoutes: FastifyPluginAsyncZod = async (app) => {
  const userService = ServiceFactory.getUserService();

  app.get(
    "/",
    {
      schema: {
        querystring: listUsersAdminQuerySchema,
      },
    },
    async (request, reply) => {
      const result = await userService.findManyUsers(request.query);
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
      const user = await userService.findUserById(request.params.id);
      return reply.status(200).send({
        success: true,
        user,
      });
    },
  );

  app.patch(
    "/:id/status",
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: adminUpdateUserStatusDtoSchema,
      },
    },
    async (request, reply) => {
      const user = await userService.updateStatus(
        request.params.id,
        request.body,
      );
      return reply.status(200).send({
        success: true,
        message: "Status do usuário atualizado com sucesso",
        user,
      });
    },
  );

  app.patch(
    "/:id/role",
    {
      preHandler: [app.requireAdmin("admin")],
      schema: {
        params: z.object({ id: z.string() }),
        body: adminUpdateUserRoleDtoSchema,
      },
    },
    async (request, reply) => {
      const user = await userService.updateRole(
        request.user._id,
        request.params.id,
        request.body,
      );
      return reply.status(200).send({
        success: true,
        message: "Cargo do usuário atualizado com sucesso",
        user,
      });
    },
  );

  app.post(
    "/:id/petals/adjust",
    {
      preHandler: [app.requireAdmin("admin")],
      schema: {
        params: z.object({ id: z.string() }),
        body: adminAdjustPetalsDtoSchema,
      },
    },
    async (request, reply) => {
      const user = await userService.adjustPetalsByAdmin(
        request.params.id,
        request.body,
      );
      return reply.status(200).send({
        success: true,
        message: "Saldo de pétalas ajustado com sucesso",
        user,
      });
    },
  );
};
