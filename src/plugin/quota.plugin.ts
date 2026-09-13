import type { CreatePackDto } from "@/dtos";
import { ServiceFactory } from "@/factories";
import { StorageQuotaUtils } from "@/utils";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

async function quotaPlugin(fastify: FastifyInstance) {
  const creationQuotaService = ServiceFactory.getCreationQuotaService();
  const packService = ServiceFactory.getPackService();
  const userService = ServiceFactory.getUserService();

  fastify.decorate(
    "checkPackCreationQuota",
    async function (request: FastifyRequest, reply: FastifyReply) {
      if (!request.user) {
        return reply.status(401).send({
          success: false,
          message: "Você precisa estar conectado para criar um pacote.",
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
    async function (request: FastifyRequest, reply: FastifyReply) {
      if (!request.user) {
        return reply.status(401).send({
          success: false,
          message: "Você precisa estar conectado para adicionar figurinhas.",
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

      request.pack = pack;

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

  fastify.decorate(
    "checkStorageQuota",
    async function (request: FastifyRequest, reply: FastifyReply) {
      if (!request.user) {
        return reply.status(401).send({
          success: false,
          message: "Você precisa estar conectado para fazer upload.",
        });
      }

      const isVip = request.user.premium === true;
      const dbUser = await userService.findUserById(request.user._id);
      if (!dbUser) {
        return reply.status(401).send({
          success: false,
          message: "Usuário não encontrado.",
        });
      }

      const usedBytes = dbUser.storage_used_bytes ?? 0;
      const limitBytes = StorageQuotaUtils.getLimitForUser(isVip);

      const contentLength = Number(request.headers["content-length"] ?? 0);

      if (
        !StorageQuotaUtils.hasAvailableStorage(usedBytes, contentLength, isVip)
      ) {
        return reply.status(403).send({
          success: false,
          code: "STORAGE_LIMIT_EXCEEDED",
          message: isVip
            ? `Limite de armazenamento atingido (${StorageQuotaUtils.formatBytes(limitBytes)} para plano VIP).`
            : `Limite de armazenamento atingido (${StorageQuotaUtils.formatBytes(limitBytes)} para plano Free). Faça upgrade para VIP e desbloqueie ${StorageQuotaUtils.formatBytes(StorageQuotaUtils.VIP_LIMIT_BYTES)}!`,
          storage: {
            used_bytes: usedBytes,
            limit_bytes: limitBytes,
            is_vip: isVip,
          },
        });
      }
    },
  );
}

export default fp(quotaPlugin);
