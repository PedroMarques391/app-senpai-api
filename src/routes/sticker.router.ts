import { createStickerDtoSchema, updateStickerDtoSchema } from "@/dtos";
import { StickerRepository } from "@/repositories";
import { StickerService } from "@/services";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z, { ZodError } from "zod";

const stickerRepository = new StickerRepository();
const stickerService = new StickerService(stickerRepository);

export const stickerRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/", async (request, reply) => {
    try {
      const stickers = await stickerService.findAll();
      return reply.status(200).send({
        success: true,
        stickers,
      });
    } catch (err) {
      if (err instanceof Error) {
        return reply.status(400).send({
          success: false,
          message: err.message,
        });
      }
      return reply.status(500).send({
        success: false,
        message: "Erro ao buscar figurinhas",
      });
    }
  });

  app.post(
    "/",
    {
      schema: {
        body: createStickerDtoSchema,
      },
    },
    async (request, reply) => {
      try {
        const sticker = await stickerService.create(
          request.user._id,
          request.body,
        );

        return reply.status(201).send({
          success: true,
          message: "Figurinha criada com sucesso",
          sticker,
        });
      } catch (err) {
        if (err instanceof ZodError) {
          return reply.status(400).send({
            success: false,
            message: "Dados de criação de figurinha inválidos",
            errors: err.flatten().fieldErrors,
          });
        }

        if (err instanceof Error) {
          return reply.status(400).send({
            success: false,
            message: err.message,
          });
        }

        return reply.status(500).send({
          success: false,
          message: "Erro interno do servidor",
        });
      }
    },
  );

  app.get(
    "/:id",
    {
      schema: {
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (request, reply) => {
      try {
        const sticker = await stickerService.findById(request.params.id);
        if (!sticker) {
          return reply.status(404).send({
            success: false,
            message: "Figurinha não encontrada",
          });
        }

        return reply.status(200).send({
          success: true,
          sticker,
        });
      } catch (err) {
        if (err instanceof Error) {
          return reply.status(400).send({
            success: false,
            message: err.message,
          });
        }
        return reply.status(500).send({
          success: false,
          message: "Erro interno ao buscar figurinha",
        });
      }
    },
  );

  app.put(
    "/:id",
    {
      schema: {
        params: z.object({
          id: z.string(),
        }),
        body: updateStickerDtoSchema,
      },
    },
    async (request, reply) => {
      try {
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
      } catch (err) {
        if (err instanceof ZodError) {
          return reply.status(400).send({
            success: false,
            message: "Dados de atualização de figurinha inválidos",
            errors: err.flatten().fieldErrors,
          });
        }

        if (err instanceof Error) {
          return reply.status(400).send({
            success: false,
            message: err.message,
          });
        }

        return reply.status(500).send({
          success: false,
          message: "Erro interno do servidor",
        });
      }
    },
  );

  app.delete(
    "/:id",
    {
      schema: {
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (request, reply) => {
      try {
        await stickerService.delete(request.params.id, request.user._id);

        return reply.status(200).send({
          success: true,
          message: "Figurinha deletada com sucesso",
        });
      } catch (err) {
        if (err instanceof Error) {
          return reply.status(400).send({
            success: false,
            message: err.message,
          });
        }

        return reply.status(500).send({
          success: false,
          message: "Erro interno do servidor",
        });
      }
    },
  );
};
