import { CloudinaryInitializer, MongoInitializer } from "@/init";
import { authPlugin, errorPlugin, redisPlugin } from "@/plugin";
import {
  adminRouter,
  authRoutes,
  contentRoutes,
  inventoryRoutes,
  packRoutes,
  profileRoutes,
  stickerRoutes,
  storeRoutes,
  termsRoutes,
  uploadRoutes,
} from "@/routes";
import { WhatsAppWorker } from "@/workers";
import fastifyMultipart from "@fastify/multipart";
import fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";

import fastifyCors from "@fastify/cors";

const server = fastify().withTypeProvider<ZodTypeProvider>();

server.register(fastifyCors, {
  origin: true,
  credentials: true,
  exposedHeaders: ["Authorization"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
});

server.register(fastifyMultipart);
server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

server.register(errorPlugin);
server.register(authPlugin);
server.register(redisPlugin);
server.register(authRoutes, { prefix: "/auth" });
server.register(packRoutes, { prefix: "/pack" });
server.register(adminRouter, { prefix: "/admin" });

server.register(async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.get("/me", async (request, reply) => {
    return reply.status(200).send({
      message: "User fetched successfully",
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
});

const bootstrap = async () => {
  try {
    CloudinaryInitializer.init();
    await MongoInitializer.init();
    new WhatsAppWorker();
    server.listen({ port: 3000, host: "0.0.0.0" }, (err, address) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      console.log(`✅ Server is running at ${address}`);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

bootstrap();
