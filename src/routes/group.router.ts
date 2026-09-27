import {
  createGroupDtoSchema,
  updateGroupDtoSchema,
  updateGroupItemDtoSchema,
} from "@/dtos";
import { GroupRepository } from "@/repositories";
import { GroupService } from "@/services";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z from "zod";

export const groupRoutes: FastifyPluginAsyncZod = async (app) => {
  const repository = new GroupRepository();
  const service = new GroupService(repository);

  app.get("/", async (request, reply) => {
    const groups = await service.findManyGroups(request.user._id);
    return reply.status(200).send({
      success: true,
      groups,
    });
  });

  app.get(
    "/:id",
    {
      schema: {
        params: z.object({ id: z.string() }),
      },
    },
    async (request, reply) => {
      const group = await service.findGroupById(
        request.user._id,
        request.params.id,
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
      schema: {
        body: createGroupDtoSchema,
      },
    },
    async (request, reply) => {
      const group = await service.createGroup(request.user._id, request.body);
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
      schema: {
        params: z.object({ id: z.string() }),
        body: updateGroupDtoSchema,
      },
    },
    async (request, reply) => {
      const group = await service.updateGroup(
        request.user._id,
        request.params.id,
        request.body,
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
      schema: {
        params: z.object({ itemId: z.string() }),
        body: updateGroupItemDtoSchema,
      },
    },
    async (request, reply) => {
      const group = await service.updateGroupItem(
        request.user._id,
        request.params.itemId,
        request.body,
      );

      const updatedItem = group.groups.find((item) => item.id === request.params.itemId);

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
      schema: {
        params: z.object({ itemId: z.string() }),
      },
    },
    async (request, reply) => {
      const group = await service.deleteGroupItem(
        request.user._id,
        request.params.itemId,
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
      schema: {
        params: z.object({ id: z.string() }),
      },
    },
    async (request, reply) => {
      await service.deleteGroup(request.user._id, request.params.id);
      return reply.status(200).send({
        success: true,
        message: "Grupo removido com sucesso",
      });
    },
  );
};
