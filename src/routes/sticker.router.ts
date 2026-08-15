import { createStickerDtoSchema, updateStickerDtoSchema } from "@/dtos";
import { ServiceFactory } from "@/factories";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z from "zod";

export const stickerRoutes: FastifyPluginAsyncZod = async (app) => {
  const stickerService = ServiceFactory.getStickerService();

  app.get("/", async (_request, reply) => {
    const stickers = await stickerService.findAll();
    return reply.status(200).send({ success: true, stickers });
  });

  app.get(
    "/pack/:packId",
    { schema: { params: z.object({ packId: z.string() }) } },
    async (request, reply) => {
      const stickers = await stickerService.findByPackId(request.params.packId);
      return reply.status(200).send({ success: true, stickers });
    },
  );

  app.post(
    "/:packId",
    {
      schema: {
        body: createStickerDtoSchema,
        params: z.object({ packId: z.string() }),
      },
    },
    async (request, reply) => {
      const sticker = await stickerService.create(
        request.params.packId,
        request.user._id,
        request.body,
      );
      return reply.status(201).send({
        success: true,
        message: "Figurinha criada com sucesso",
        sticker,
      });
    },
  );

  app.get(
    "/:id",
    { schema: { params: z.object({ id: z.string() }) } },
    async (request, reply) => {
      const sticker = await stickerService.findById(request.params.id);
      if (!sticker) {
        return reply.status(404).send({
          success: false,
          message: "Figurinha não encontrada",
        });
      }
      return reply.status(200).send({ success: true, sticker });
    },
  );

  app.put(
    "/:id",
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: updateStickerDtoSchema,
      },
    },
    async (request, reply) => {
      const sticker = await stickerService.update(
        request.params.id,
        request.user._id,
        request.body,
      );
      return reply.status(200).send({
        success: true,
        message: "Figurinha atualizada com sucesso",
        sticker,
      });
    },
  );

  app.delete(
    "/:id",
    { schema: { params: z.object({ id: z.string() }) } },
    async (request, reply) => {
      await stickerService.delete(request.params.id, request.user._id);
      return reply.status(200).send({
        success: true,
        message: "Figurinha deletada com sucesso",
      });
    },
  );
};
