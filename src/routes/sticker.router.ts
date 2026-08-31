import { createStickerDtoSchema, updateStickerDtoSchema } from "@/dtos";
import { ServiceFactory } from "@/factories";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z from "zod";

export const stickerRoutes: FastifyPluginAsyncZod = async (app) => {
  const stickerService = ServiceFactory.getStickerService();
  const cacheService = ServiceFactory.getCacheService(app.redis);

  app.get(
    "/",
    {
      schema: {
        querystring: z.object({
          user: z.string().optional(),
          pack: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      if (request.query.user) {
        const stickers = await stickerService.listStickersByUserId(
          request.query.user,
          request.user._id,
        );
        return reply.status(200).send({ success: true, stickers });
      }

      if (request.query.pack) {
        const cacheKey = `stickers:pack:${request.query.pack}`;
        const cached = await cacheService.get(cacheKey);

        if (cached) {
          return reply.status(200).send({ success: true, stickers: cached });
        }

        const stickers = await stickerService.listStickersByPackId(
          request.query.pack,
        );
        await cacheService.set(cacheKey, stickers, 60 * 60 * 24);
        return reply.status(200).send({ success: true, stickers });
      }

      const stickers = await stickerService.findManyStickers();
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
      const sticker = await stickerService.createSticker(
        request.params.packId,
        request.user._id,
        request.body,
      );
      await cacheService.del(`stickers:pack:${request.params.packId}`);
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
      const cacheKey = `sticker:${request.params.id}`;
      const cached = await cacheService.get(cacheKey);

      if (cached) {
        return reply.status(200).send({ success: true, sticker: cached });
      }

      const sticker = await stickerService.findStickerById(request.params.id);
      if (!sticker) {
        return reply.status(404).send({
          success: false,
          message: "Figurinha não encontrada",
        });
      }

      await cacheService.set(cacheKey, sticker, 60 * 60 * 24);
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
      const sticker = await stickerService.updateSticker(
        request.params.id,
        request.user._id,
        request.body,
      );

      await Promise.all([
        cacheService.del(`sticker:${request.params.id}`),
        cacheService.delPattern("stickers:pack:*"),
      ]);

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
      await stickerService.deleteSticker(request.params.id, request.user._id);

      await Promise.all([
        cacheService.del(`sticker:${request.params.id}`),
        cacheService.delPattern("stickers:pack:*"),
      ]);

      return reply.status(200).send({
        success: true,
        message: "Figurinha deletada com sucesso",
      });
    },
  );
};
