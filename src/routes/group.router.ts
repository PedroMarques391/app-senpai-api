import {
  createGroupDtoSchema,
  updateGroupDtoSchema,
  updateGroupItemDtoSchema,
} from "@/dtos";
import { ServiceFactory } from "@/factories";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z from "zod";

export const groupRoutes: FastifyPluginAsyncZod = async (app) => {
  const groupService = ServiceFactory.getGroupService(app.redis);

  app.get(
    "/moderate",
    {
      schema: {
        querystring: z.object({
          token: z.string().min(1, "Token é obrigatório"),
        }),
      },
    },
    async (request, reply) => {
      const { token } = request.query;
      const result = await groupService.moderateGroupItem(token);

      return reply.status(200).send({
        success: true,
        message: `Grupo ${result.item.title} ${result.action === "accepted" ? "aprovado" : "rejeitado"} com sucesso`,
        group: result.group,
        item: result.item,
      });
    },
  );

  app.get(
    "/",
    {
      onRequest: [app.authenticate, app.requireMaster],
    },
    async (request, reply) => {
      const groups = await groupService.findManyGroups(
        request.user._id,
        request.user.subscription?.type,
      );
      return reply.status(200).send({
        success: true,
        groups,
      });
    },
  );

  app.get(
    "/:id",
    {
      onRequest: [app.authenticate, app.requireMaster],
      schema: {
        params: z.object({ id: z.string() }),
      },
    },
    async (request, reply) => {
      const group = await groupService.findGroupById(
        request.user._id,
        request.params.id,
        request.user.subscription?.type,
      );
      return reply.status(200).send({
        success: true,
        group,
      });
    },
  );

  app.post(
    "/",
    {
      onRequest: [app.authenticate, app.requireMaster],
      schema: {
        body: createGroupDtoSchema,
      },
    },
    async (request, reply) => {
      const group = await groupService.createGroup(
        request.user._id,
        request.user.email,
        request.user.userName || request.user.name,
        request.body,
        request.user.subscription?.type,
      );
      return reply.status(201).send({
        success: true,
        message: "Grupo criado com sucesso",
        group,
      });
    },
  );

  app.put(
    "/:id",
    {
      onRequest: [app.authenticate, app.requireMaster],
      schema: {
        params: z.object({ id: z.string() }),
        body: updateGroupDtoSchema,
      },
    },
    async (request, reply) => {
      const group = await groupService.updateGroup(
        request.user._id,
        request.params.id,
        request.body,
        request.user.subscription?.type,
      );
      return reply.status(200).send({
        success: true,
        message: "Grupo atualizado com sucesso",
        group,
      });
    },
  );

  app.patch(
    "/item/:itemId",
    {
      onRequest: [app.authenticate, app.requireMaster],
      schema: {
        params: z.object({ itemId: z.string() }),
        body: updateGroupItemDtoSchema,
      },
    },
    async (request, reply) => {
      const group = await groupService.updateGroupItem(
        request.user._id,
        request.user.email,
        request.user.userName || request.user.name,
        request.params.itemId,
        request.body,
        request.user.subscription?.type,
      );

      const updatedItem = group.groups.find(
        (item) => item.id === request.params.itemId,
      );

      return reply.status(200).send({
        success: true,
        message: `Grupo ${updatedItem?.title} atualizado com sucesso`,
        group,
      });
    },
  );

  app.delete(
    "/item/:itemId",
    {
      onRequest: [app.authenticate, app.requireMaster],
      schema: {
        params: z.object({ itemId: z.string() }),
      },
    },
    async (request, reply) => {
      const group = await groupService.deleteGroupItem(
        request.user._id,
        request.user.email,
        request.user.userName || request.user.name,
        request.params.itemId,
        request.user.subscription?.type,
      );

      return reply.status(200).send({
        success: true,
        message: "Item do grupo removido com sucesso",
        group,
      });
    },
  );

  app.delete(
    "/:id",
    {
      onRequest: [app.authenticate, app.requireMaster],
      schema: {
        params: z.object({ id: z.string() }),
      },
    },
    async (request, reply) => {
      await groupService.deleteGroup(
        request.user._id,
        request.params.id,
        request.user.subscription?.type,
      );
      return reply.status(200).send({
        success: true,
        message: "Grupo removido com sucesso",
      });
    },
  );
};
