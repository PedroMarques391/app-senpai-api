import type { CreatePackDto } from "@/dtos";
import { ServiceFactory } from "@/factories";
import type { User } from "@/models";
import type { VipType } from "@/schemas";
import { StorageQuotaUtils } from "@/utils";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

async function quotaPlugin(fastify: FastifyInstance) {
  const creationQuotaService = ServiceFactory.getCreationQuotaService();
  const packService = ServiceFactory.getPackService();
  const profileService = ServiceFactory.getProfileService();
  const cacheService = ServiceFactory.getCacheService(fastify.redis);

  const getProfile = async (userId: string): Promise<User | null> => {
    const cacheKey = `profile:${userId}`;
    const cached = await cacheService.get<User>(cacheKey);
    if (cached) return cached;
    const profile = await profileService.getProfile(userId);
    if (profile) {
      await cacheService.set(cacheKey, profile, 60 * 60 * 24);
    }
    return profile;
  };

  fastify.decorate(
    "checkPackCreationQuota",
    async function (request: FastifyRequest, reply: FastifyReply) {
      if (!request.user) {
        return reply.status(401).send({
          success: false,
          message: "Você precisa estar conectado para criar um pacote.",
        });
      }

      const profile = await getProfile(request.user._id);
      const isVip = profile?.premium === true;
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

      const profile = await getProfile(request.user._id);
      const isVip = profile?.premium === true;
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

      const profile = await getProfile(request.user._id);
      if (!profile) {
        return reply.status(401).send({
          success: false,
          message: "Usuário não encontrado.",
        });
      }

      const subscriptionType: VipType = profile.subscription?.type ?? "FREE";
      const limitBytes = StorageQuotaUtils.getLimit(subscriptionType);
      const planTier = StorageQuotaUtils.toPlanTier(subscriptionType);

      const usedBytes = profile.storage_used_bytes ?? 0;
      const contentLength = Number(request.headers["content-length"] ?? 0);

      const hasAvailableStorage = StorageQuotaUtils.hasAvailableStorage(
        usedBytes,
        contentLength,
        subscriptionType,
      );

      if (!hasAvailableStorage) {
        let message: string;
        switch (subscriptionType) {
          case "MESTRE":
            message = `Limite de armazenamento atingido (${StorageQuotaUtils.formatBytes(limitBytes)} para plano VIP Mestre). Libere espaço excluindo figurinhas ou mídias antigas.`;
            break;
          case "PRO":
            message = `Limite de armazenamento atingido (${StorageQuotaUtils.formatBytes(limitBytes)} para plano VIP Pro). Faça upgrade para VIP Mestre e desbloqueie ${StorageQuotaUtils.formatBytes(StorageQuotaUtils.VIP_MASTER_LIMIT_BYTES)}!`;
            break;
          case "FREE":
          default:
            message = `Limite de armazenamento atingido (${StorageQuotaUtils.formatBytes(limitBytes)} para plano Free). Faça upgrade para VIP e desbloqueie até ${StorageQuotaUtils.formatBytes(StorageQuotaUtils.VIP_MASTER_LIMIT_BYTES)}!`;
            break;
        }

        return reply.status(403).send({
          success: false,
          code: "STORAGE_LIMIT_EXCEEDED",
          message,
          storage: {
            used_bytes: usedBytes,
            limit_bytes: limitBytes,
            plan_tier: planTier,
            is_vip: subscriptionType !== "FREE",
          },
        });
      }
    },
  );
}

export default fp(quotaPlugin);
