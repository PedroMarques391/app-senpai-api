import { UploadService } from "@/services";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z from "zod";

const uploadService = new UploadService();

export const uploadRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/",
    {
      schema: {
        querystring: z.object({
          folder: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      try {
        const data = await request.file();
        if (!data) {
          return reply.status(400).send({
            success: false,
            message: "Nenhum arquivo enviado",
          });
        }

        const rawUsername = request.user?.userName || request.user?.name || "user";
        const username = rawUsername.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
        const baseFolder = request.query.folder || "sticker";
        const folderPath = `${baseFolder}/${username}`;

        const timestamp = Date.now();
        const uniqueId = crypto.randomUUID().slice(0, 8);
        const filename = `${username}_${timestamp}_${uniqueId}`;

        const result = await uploadService.upload(data.file, {
          folder: folderPath,
          public_id: filename,
          unique_filename: true,
        });

        return reply.status(201).send({
          success: true,
          message: "Upload realizado com sucesso",
          cloudinary_id: result.public_id,
          sticker_url: result.secure_url,
          public_id: result.public_id,
          secure_url: result.secure_url,
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
          message: "Erro ao realizar upload do arquivo",
        });
      }
    });

  app.delete(
    "/:public_id",
    {
      schema: {
        params: z.object({
          public_id: z.string(),
        }),
      },
    },
    async (request, reply) => {
      try {
        const result = await uploadService.delete(request.params.public_id);

        return reply.status(200).send({
          success: true,
          message: "Arquivo excluído com sucesso",
          result,
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
          message: "Erro ao excluir arquivo",
        });
      }
    },
  );
};
