import { CloudinaryInitializer, MongoInitializer } from "@/init";
import authPlugin from "@/plugin/auth.plugin";
import { errorPlugin } from "@/plugin/error.plugin";
import {
  authRoutes,
  packRoutes,
  profileRoutes,
  stickerRoutes,
  uploadRoutes,
} from "@/routes";
import fastifyMultipart from "@fastify/multipart";
import fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";

const server = fastify().withTypeProvider<ZodTypeProvider>();

server.register(fastifyMultipart);
server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

server.register(errorPlugin);
server.register(authPlugin);
server.register(authRoutes, { prefix: "/auth" });

server.register(async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.get("/me", async (request, reply) => {
    return reply.status(200).send({
      message: "User fetched successfully",
      success: true,
      user: request.user,
    });
  });

  app.get("/", async () => {
    return "This is senpai backend...";
  });

  app.register(packRoutes, { prefix: "/pack" });
  app.register(profileRoutes, { prefix: "/profile" });
  app.register(stickerRoutes, { prefix: "/sticker" });
  app.register(uploadRoutes, { prefix: "/upload" });
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
