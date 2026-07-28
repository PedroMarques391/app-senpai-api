import "@fastify/jwt";
import "fastify";

declare module "fastify" {
  export interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    user: {
      wa_id: string;
      name: string;
      userName: string;
      email: string;
      isNumberVerified: boolean;
      role: "user" | "admin" | "moderator";
      premium: boolean;
    };
  }
}
