import { CloudinaryInitializer, MongoInitializer, BullMQInitializer, MailerInitializer } from "@/init";
import { authPlugin, errorPlugin, redisPlugin, quotaPlugin, mailerPlugin } from "@/plugin";
import {
  adminRouter,
  authRoutes,
  contentRoutes,
  creationQuotaRoutes,
  inventoryRoutes,
  packRoutes,
  profileRoutes,
  stickerRoutes,
  storeRoutes,
  termsRoutes,
  uploadRoutes,
} from "@/routes";
import { WhatsAppWorker, EmailWorker } from "@/workers";
import fastifyMultipart from "@fastify/multipart";
import fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";

import fastifyCors from "@fastify/cors";

const server = fastify({
  logger:
    process.env.NODE_ENV === "production"
      ? true
      : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
          },
        },
      },
}).withTypeProvider<ZodTypeProvider>();

server.register(fastifyCors, {
  origin: true,
  credentials: true,
  exposedHeaders: ["Authorization"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
});

server.register(fastifyMultipart);
server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

server.register(errorPlugin);
server.register(authPlugin);
server.register(redisPlugin);
server.register(quotaPlugin);
server.register(mailerPlugin);
server.register(authRoutes, { prefix: "/auth" });
server.register(packRoutes, { prefix: "/pack" });
server.register(adminRouter, { prefix: "/admin" });
server.get("/health", (request, reply) => {
  return reply.status(200).send({
    message: "Server is running",
    success: true,
  });
});

server.register(async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.get("/me", async (request, reply) => {
    return reply.status(200).send({
      message: "Dados do usuário carregados com sucesso.",
      success: true,
      user: request.user,
    });
  });

  app.register(inventoryRoutes, { prefix: "/inventory" });
  app.register(profileRoutes, { prefix: "/profile" });
  app.register(stickerRoutes, { prefix: "/sticker" });
  app.register(storeRoutes, { prefix: "/store" });
  app.register(uploadRoutes, { prefix: "/upload" });
  app.register(contentRoutes, { prefix: "/content" });
  app.register(termsRoutes, { prefix: "/terms" });
  app.register(creationQuotaRoutes, { prefix: "/creation/quota" });
});

const bootstrap = async () => {
  try {
    CloudinaryInitializer.init();
    BullMQInitializer.setLogger(server.log);
    await MongoInitializer.init(server.log);
    await MailerInitializer.init(server.log);
    new WhatsAppWorker(server.log);
    new EmailWorker(MailerInitializer.getTransporter(), server.log);
    server.listen({ port: 3000, host: "0.0.0.0" }, (err, address) => {
      if (err) {
        server.log.error(err);
        process.exit(1);
      }
      server.log.info(`Server is running at ${address}`);
    });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

bootstrap();
