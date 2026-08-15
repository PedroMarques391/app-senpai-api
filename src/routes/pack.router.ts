import { createPackDtoSchema, updatePackDtoSchema } from "@/dtos";
import { ServiceFactory } from "@/factories";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z from "zod";

export const packRoutes: FastifyPluginAsyncZod = async (app) => {
  const packService = ServiceFactory.getPackService();

  app.get("/", async (_request, reply) => {
    const packs = await packService.findAll();
    return reply.status(200).send({ success: true, packs });
  });

  app.post(
    "/",
    { schema: { body: createPackDtoSchema } },
    async (request, reply) => {
      const pack = await packService.create(
        request.user._id,
        request.user.userName,
        request.body,
      );
      return reply.status(201).send({
        success: true,
        message: "Pacote criado com sucesso",
        pack,
      });
    },
  );

  app.get(
    "/:id",
    { schema: { params: z.object({ id: z.string() }) } },
    async (request, reply) => {
      const pack = await packService.findById(request.params.id);
      if (!pack) {
        return reply.status(404).send({
          success: false,
          message: "Pacote não encontrado",
        });
      }
      return reply.status(200).send({ success: true, pack });
    },
  );

  app.put(
    "/:id",
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: updatePackDtoSchema,
      },
    },
    async (request, reply) => {
      const pack = await packService.update(
        request.params.id,
        request.user._id,
        request.body,
      );
      return reply.status(200).send({
        success: true,
        message: "Pacote atualizado com sucesso",
        pack,
      });
    },
  );

  app.delete(
    "/:id",
    { schema: { params: z.object({ id: z.string() }) } },
    async (request, reply) => {
      await packService.delete(request.params.id, request.user._id);
      return reply.status(200).send({
        success: true,
        message: "Pacote deletado com sucesso",
      });
    },
  );
};
