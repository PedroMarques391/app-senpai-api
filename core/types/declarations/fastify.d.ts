import type { StickerPack, User } from "@/models";
import type { UserRole } from "@/schemas";
import type { EmailProvider } from "@/types";
import "@fastify/jwt";
import "fastify";
import type { RedisClientType } from "redis";

declare module "fastify" {
  export interface FastifyRequest {
    pack?: StickerPack;
    profile?: User;
  }

  export interface FastifyInstance {
    redis: RedisClientType;
    mailer: EmailProvider;
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAdmin: (
      ...allowedRoles: UserRole[]
    ) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireMaster: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireVerifiedEmail: (
      req: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
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
      role: UserRole;
    };
  }
}
