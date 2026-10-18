import { uploadSignatureQuerySchema } from "@/dtos";
import { ServiceFactory } from "@/factories";
import { UploadUtils } from "@/utils";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z from "zod";

export const uploadRoutes: FastifyPluginAsyncZod = async (app) => {
  const uploadService = ServiceFactory.getUploadService();

  app.get(
    "/signature",
    {
      schema: {
        querystring: uploadSignatureQuerySchema,
      },
      preHandler: [app.checkStorageQuota, app.requireVerifiedEmail],
    },
    async (request, reply) => {
      const { userName } = request.user;
      if (!userName) {
        return reply.status(401).send({
          success: false,
          code: "USER_NAME_REQUIRED",
          message:
            "Para realizar o upload é necessário ter um nome de usuário, por favor atualize seu perfil.",
        });
      }

      const { folderPath, filename } = UploadUtils.generateMetadata(
        userName,
        request.query.folder,
      );

      const signatureData = uploadService.generateSignature(
        folderPath,
        filename,
      );

      return reply.status(200).send({
        success: true,
        ...signatureData,
        data: signatureData,
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
