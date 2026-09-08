import { ServiceFactory } from "@/factories";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import type { CreatePackDto, CreateStickerDto } from "@/dtos";

async function quotaPlugin(fastify: FastifyInstance) {
  const creationQuotaService = ServiceFactory.getCreationQuotaService();
  const packService = ServiceFactory.getPackService();

  fastify.decorate(
    "checkPackCreationQuota",
    async function (
      request: FastifyRequest,
      reply: FastifyReply,
    ) {
      if (!request.user) {
        return reply.status(401).send({
          success: false,
          message: "Operation not permitted",
        });
      }

      const isVip = request.user.premium === true;
      if (isVip) {
        return;
      }

      const body = request.body as CreatePackDto;
      const packName = body.pack_name;
      const stickerCount = body.stickers?.length ?? 0;

      const check = await creationQuotaService.canCreate(
        request.user._id,
        packName,
        stickerCount,
        false,
      );

      if (!check.allowed) {
        return reply.status(403).send({
          success: false,
          code: "QUOTA_EXCEEDED",
          message:
            check.reason ?? "Limite de criação atingido para o plano Free.",
        });
      }
    },
  );

  fastify.decorate(
    "checkStickerCreationQuota",
    async function (
      request: FastifyRequest,
      reply: FastifyReply,
    ) {
      if (!request.user) {
        return reply.status(401).send({
          success: false,
          message: "Operation not permitted",
        });
      }

      const isVip = request.user.premium === true;
      if (isVip) {
        return;
      }

      const { packId } = request.params as { packId: string };
      const pack = await packService.findPackById(packId);
      if (!pack) {
        return reply.status(404).send({
          success: false,
          message: "Pacote não encontrado",
        });
      }

      const check = await creationQuotaService.canCreate(
        request.user._id,
        pack.pack_name,
        1,
        false,
      );

      if (!check.allowed) {
        return reply.status(403).send({
          success: false,
          code: "QUOTA_EXCEEDED",
          message:
            check.reason ?? "Limite de criação atingido para o plano Free.",
        });
      }
    },
  );
}

export default fp(quotaPlugin);
