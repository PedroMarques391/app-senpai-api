import { MailerInitializer } from "@/init";
import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";

async function mailerPlugin(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.decorate("mailer", MailerInitializer.getTransporter());
}

export default fp(mailerPlugin);