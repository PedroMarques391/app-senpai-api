import type { UserRole } from "@/schemas";
import "@fastify/jwt";
import "fastify";
import type { RedisClientType } from "redis";
import type { Mail, SMTPSentMessageInfo } from "nodemailer";

declare module "fastify" {
  export interface FastifyInstance {
    redis: RedisClientType;
    mailer: Mail<SMTPSentMessageInfo>;
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
    };
  }
}
