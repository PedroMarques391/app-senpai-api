import { uploadPresignedQuerySchema } from "@/dtos";
import { AppError, VerifyOwnershipError } from "@/errors";
import { ServiceFactory } from "@/factories";
import { UploadUtils } from "@/utils";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z from "zod";

export const uploadRoutes: FastifyPluginAsyncZod = async (app) => {
  const uploadService = ServiceFactory.getUploadService();

  app.get(
    "/presigned-url",
    {
      schema: {
        querystring: uploadPresignedQuerySchema,
      },
      preHandler: [
        app.checkStorageQuota,
        app.requireVerifiedEmail,
        app.requireVerifiedNumber,
      ],
    },
    async (request, reply) => {
      const { userName } = request.user;
      if (!userName) {
        throw new AppError(
          "Para realizar o upload é necessário ter um nome de usuário, por favor atualize seu perfil.",
          401,
          "USER_NAME_REQUIRED",
        );
      }

      const { folderPath, filename } = UploadUtils.generateMetadata(
        userName,
        request.query.folder,
      );

      const presignedData = await uploadService.generatePresignedUrl(
        folderPath,
        filename,
      );

      return reply.status(200).send({
        success: true,
        ...presignedData,
        upload_url: presignedData.uploadUrl,
        public_id: presignedData.key,
        data: presignedData,
      });
    },
  );

  app.post("/", async (_request, reply) => {
    return reply.status(426).send({
      success: false,
      code: "APP_UPDATE_REQUIRED",
      message:
        "O envio direto de arquivos foi descontinuado. Por favor, atualize o aplicativo na Google Play Store ou App Store para continuar enviando suas figurinhas e fotos.",
      upgrade_required: true,
    });
  });

  app.delete(
    "/",
    {
      schema: {
        querystring: z.object({
          public_id: z.string().optional(),
          key: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      const fileKey = request.query.key || request.query.public_id;
      if (!fileKey) {
        throw new AppError(
          "Parâmetro key ou public_id é obrigatório.",
          400,
          "FILE_KEY_REQUIRED",
        );
      }

      if (!UploadUtils.verifyOwnership(fileKey, request.user.userName)) {
        throw new VerifyOwnershipError(
          "Operação não permitida: você não pode excluir arquivos de outro usuário",
        );
      }

      const result = await uploadService.delete(fileKey);
      return reply.status(200).send({
        success: true,
        message: "Arquivo excluído com sucesso",
        result,
      });
    },
  );
};
