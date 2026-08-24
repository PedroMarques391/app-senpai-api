import { ServiceFactory } from "@/factories";
import { UploadUtils } from "@/utils";
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

      const { userName } = request.user;
      if (!userName) {
        return reply.status(401).send({
          success: false,
          message:
            "Para criar um sticker é necessário ter um nome de usuário, por favor atualize seu perfil.",
        });
      }

      const { folderPath, filename } = UploadUtils.generateMetadata(
        userName,
        request.query.folder,
      );

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
        type: result.format,
      });
    },
  );

  app.delete(
    "/",
    { schema: { querystring: z.object({ public_id: z.string() }) } },
    async (request, reply) => {
      if (
        !UploadUtils.verifyOwnership(
          request.query.public_id,
          request.user.userName,
        )
      ) {
        return reply.status(403).send({
          success: false,
          message:
            "Operação não permitida: você não pode excluir arquivos de outro usuário",
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
