import fastifyJwt from "@fastify/jwt";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

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

  fastify.decorate(
    "requireAdmin",
    async function (request: FastifyRequest, reply: FastifyReply) {
      if (request.user?.role !== "admin") {
        return reply.status(403).send({
          success: false,
          message: "Acesso negado. Requer privilégios de administrador.",
        });
      }
    },
  );
}

export default fp(authPlugin);
