import { createPackDtoSchema, updatePackDtoSchema } from "@/dtos";
import { ServiceFactory } from "@/factories";
import { packCategoryEnum } from "@/models";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z from "zod";

export const packRoutes: FastifyPluginAsyncZod = async (app) => {
  const packService = ServiceFactory.getPackService();

  app.get(
    "/",
    {
      schema: {
        querystring: z.object({
          user: z.string().optional(),
          name: z.string().optional(),
          tags: z
            .union([z.string(), z.array(z.string())])
            .transform((value) => (typeof value === "string" ? [value] : value))
            .optional(),
          category: packCategoryEnum.optional(),
          page: z.coerce.number().int().min(1).default(1),
          limit: z.coerce.number().int().min(1).max(50).default(20),
        }),
      },
    },
    async (request, reply) => {
      const { user, name, tags, category, page, limit } = request.query;

      if (user) {
        const packs = await packService.findByUserId(user, request.user._id);
        return reply.status(200).send({ success: true, packs });
      }

      const result = await packService.findAll(
        {
          search: name,
          tags,
          category,
        },
        {
          page,
          limit,
        },
      );

      return reply.status(200).send({
        success: true,
        data: result,
      });
    },
  );

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
