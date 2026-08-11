import { createPackDtoSchema, updatePackDtoSchema } from "@/dtos";
import { PackRepository } from "@/repositories";
import { PackService } from "@/services";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z, { ZodError } from "zod";

const packRepository = new PackRepository();
const packService = new PackService(packRepository);

export const packRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/", async (request, reply) => {
    try {
      const packs = await packService.findAll();
      return reply.status(200).send({
        success: true,
        packs,
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
        message: "Erro ao buscar pacotes",
      });
    }
  });

  app.post(
    "/",
    {
      schema: {
        body: createPackDtoSchema,
      },
    },
    async (request, reply) => {
      try {
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
      } catch (err) {
        if (err instanceof ZodError) {
          return reply.status(400).send({
            success: false,
            message: "Dados de criação de pacote inválidos",
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
        const pack = await packService.findById(request.params.id);
        if (!pack) {
          return reply.status(404).send({
            success: false,
            message: "Pacote não encontrado",
          });
        }

        return reply.status(200).send({
          success: true,
          pack,
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
          message: "Erro interno ao buscar pacote",
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
        body: updatePackDtoSchema,
      },
    },
    async (request, reply) => {
      try {
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
      } catch (err) {
        if (err instanceof ZodError) {
          return reply.status(400).send({
            success: false,
            message: "Dados de atualização de pacote inválidos",
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
        await packService.delete(request.params.id, request.user._id);

        return reply.status(200).send({
          success: true,
          message: "Pacote deletado com sucesso",
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