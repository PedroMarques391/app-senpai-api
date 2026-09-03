import {
  createPackDtoSchema,
  listPackQuerySchema,
  updatePackDtoSchema,
} from "@/dtos";
import { ServiceFactory } from "@/factories";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z from "zod";

export const packRoutes: FastifyPluginAsyncZod = async (app) => {
  const packService = ServiceFactory.getPackService();
  const cacheService = ServiceFactory.getCacheService(app.redis);

  app.get(
    "/",
    {
      schema: {
        querystring: listPackQuerySchema,
      },
    },
    async (request, reply) => {
      const { user, search, tags, category, page, limit, sort, order } =
        request.query;

      if (user) {
        if (!request.user) {
          try {
            await request.jwtVerify();
          } catch {
            return reply.status(401).send({
              message: "Operation not permitted",
              success: false,
            });
          }
        }

        const cacheKey = `pack:user:${user}`;
        const cached = await cacheService.get(cacheKey);

        if (cached) {
          return reply.status(200).send({ success: true, packs: cached });
        }

        const packs = await packService.findByUserId(user, request.user._id);
        await cacheService.set(cacheKey, packs, 60 * 60 * 24);
        return reply.status(200).send({ success: true, packs });
      }

      const hasFilters = Boolean(
        search || category || (tags && tags.length > 0),
      );
      // Include sort+order in cache key so different orderings don't share the same entry
      const cacheKey = !hasFilters
        ? `pack:list:${page || 1}:${limit || 20}:${sort || "recent"}:${order || "desc"}`
        : null;

      if (cacheKey) {
        const cached = await cacheService.get(cacheKey);
        if (cached) {
          return reply.status(200).send({
            success: true,
            data: cached,
          });
        }
      }

      const result = await packService.findManyPacks(
        {
          search,
          tags,
          category,
          sort,
          order,
        },
        {
          page,
          limit,
        },
      );

      if (cacheKey) {
        await cacheService.set(cacheKey, result, 60 * 60 * 24);
      }

      return reply.status(200).send({
        success: true,
        data: result,
      });
    },
  );

  app.post(
    "/",
    {
      onRequest: [app.authenticate],
      schema: { body: createPackDtoSchema },
    },
    async (request, reply) => {
      const pack = await packService.createPack(
        request.user._id,
        request.user.userName,
        request.body,
      );

      await Promise.all([
        cacheService.delPattern("pack:list:*"),
        cacheService.del(`pack:user:${request.user._id}`),
      ]);

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
      const cacheKey = `pack:${request.params.id}`;
      const cached = await cacheService.get(cacheKey);

      if (cached) {
        return reply.status(200).send({ success: true, pack: cached });
      }

      const pack = await packService.findPackById(request.params.id);
      if (!pack) {
        return reply.status(404).send({
          success: false,
          message: "Pacote não encontrado",
        });
      }

      await cacheService.set(cacheKey, pack, 60 * 60 * 24);
      return reply.status(200).send({ success: true, pack });
    },
  );

  app.put(
    "/:id",
    {
      onRequest: [app.authenticate],
      schema: {
        params: z.object({ id: z.string() }),
        body: updatePackDtoSchema,
      },
    },
    async (request, reply) => {
      const pack = await packService.updatePack(
        request.params.id,
        request.user._id,
        request.body,
      );

      await Promise.all([
        cacheService.del(`pack:${request.params.id}`),
        cacheService.delPattern("pack:list:*"),
        cacheService.del(`pack:user:${request.user._id}`),
      ]);

      return reply.status(200).send({
        success: true,
        message: "Pacote atualizado com sucesso",
        pack,
      });
    },
  );

  app.delete(
    "/:id",
    {
      onRequest: [app.authenticate],
      schema: { params: z.object({ id: z.string() }) },
    },
    async (request, reply) => {
      await packService.deletePack(request.params.id, request.user._id);

      await Promise.all([
        cacheService.del(`pack:${request.params.id}`),
        cacheService.delPattern("pack:list:*"),
        cacheService.del(`pack:user:${request.user._id}`),
        cacheService.delPattern("stickers:pack:*"),
      ]);

      return reply.status(200).send({
        success: true,
        message: "Pacote deletado com sucesso",
      });
    },
  );
};
