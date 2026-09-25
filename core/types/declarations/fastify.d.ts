import type { UserRole, VipType } from "@/schemas";
import type { StickerPack } from "@/models";
import "@fastify/jwt";
import "fastify";
import type { RedisClientType } from "redis";

declare module "fastify" {
  export interface FastifyRequest {
    pack?: StickerPack;
  }

  export interface FastifyInstance {
    redis: RedisClientType;
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAdmin: (
      ...allowedRoles: UserRole[]
    ) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    checkPackCreationQuota: (
      req: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
    checkStickerCreationQuota: (
      req: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
    checkStorageQuota: (
      req: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    user: {
      _id: string;
      wa_id: string;
      name: string;
      userName: string;
      email: string;
      isNumberVerified: boolean;
      role: UserRole;
      premium: boolean;
      subscription?: {
        type: VipType;
      };
    };
  }
}
