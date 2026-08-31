import fastifyJwt from "@fastify/jwt";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import type { UserRole } from "@/schemas";

async function authPlugin(fastify: FastifyInstance) {
  fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || "supersecret",
  });

  fastify.decorate(
    "authenticate",
    async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        await request.jwtVerify();
      } catch (err) {
        return reply.status(401).send({
          message: "Operation not permitted",
          success: false,
        });
      }
    },
  );

  fastify.decorate("requireAdmin", (...allowedRoles: UserRole[]) => {
    const roles: UserRole[] =
      allowedRoles.length > 0 ? allowedRoles : ["admin"];

    return async function (request: FastifyRequest, reply: FastifyReply) {
      if (!request.user || !roles.includes(request.user.role)) {
        return reply.status(403).send({
          success: false,
          message:
            "Acesso negado. Privilégios insuficientes para esta operação.",
        });
      }
    };
  });
}

export default fp(authPlugin);
