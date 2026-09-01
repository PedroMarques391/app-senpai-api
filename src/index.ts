import { QueueFactory } from "@/factories";
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
  uploadRoutes,
} from "@/routes";
import fastifyMultipart from "@fastify/multipart";
import fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import z from "zod";

const server = fastify().withTypeProvider<ZodTypeProvider>();

server.register(fastifyMultipart);
server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

server.register(errorPlugin);
server.register(authPlugin);
server.register(redisPlugin);
server.register(authRoutes, { prefix: "/auth" });
server.register(adminRouter, { prefix: "/admin" });

//TODO remove this get, only test
server.get(
  "/",
  {
    schema: {
      querystring: z.object({ id: z.string().optional() }),
    },
  },
  async (request, reply) => {
    const whatsapp = QueueFactory.getWhatsAppQueue();

    if (request.query) {
      const getQueue = await whatsapp.getQueue(request.query.id);
      return reply.status(200).send({
        queue: getQueue,
      });
    }

    const job = await whatsapp.addJob(
      "send-message",
      {
        number: "+5511998527431",
        message: "Hello, how are you?",
      },
      {
        attempts: 2,
      },
    );

    return reply.status(200).send({
      message: "Job added successfully",
      success: true,
      job,
    });
  },
);

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
  app.register(packRoutes, { prefix: "/pack" });
  app.register(profileRoutes, { prefix: "/profile" });
  app.register(stickerRoutes, { prefix: "/sticker" });
  app.register(storeRoutes, { prefix: "/store" });
  app.register(uploadRoutes, { prefix: "/upload" });
  app.register(contentRoutes, { prefix: "/content" });
});

const bootstrap = async () => {
  try {
    CloudinaryInitializer.init();
    await MongoInitializer.init();
    server.listen({ port: 3000 }, (err, address) => {
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
