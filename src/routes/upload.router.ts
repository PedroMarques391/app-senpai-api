import { ServiceFactory } from "@/factories";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z from "zod";

export const uploadRoutes: FastifyPluginAsyncZod = async (app) => {
  const uploadService = ServiceFactory.getUploadService();

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
        url: result.url,
        type: result.format
      });
    },
  );

  app.delete(
    "/",
    { schema: { querystring: z.object({ public_id: z.string() }) } },
    async (request, reply) => {
      const rawUsername = request.user?.userName || request.user?.name || "user";
      const username = rawUsername.toLowerCase().replace(/[^a-z0-9_-]/g, "_");

      if (!request.query.public_id.includes(`/${username}/`)) {
        return reply.status(403).send({
          success: false,
          message: "Operação não permitida: você não pode excluir arquivos de outro usuário",
        });
      }

      const result = await uploadService.delete(request.query.public_id);
      return reply.status(200).send({
        success: true,
        message: "Arquivo excluído com sucesso",
        result,
      });
    },
  );
};
