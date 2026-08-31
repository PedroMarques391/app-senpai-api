import type { UserRole } from "@/schemas";
import "@fastify/jwt";
import "fastify";
import type { createClient } from "redis";

declare module "fastify" {
  export interface FastifyInstance {
    redis: ReturnType<typeof createClient>;
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAdmin: (
      ...allowedRoles: UserRole[]
    ) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
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
