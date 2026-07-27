import { MongoInitializer } from "@/init/database";
import { authRoutes } from "@/routes/auth";
import fastify from "fastify";
import authPlugin from "./plugin/auth.plugin";

const server = fastify();

server.register(authPlugin);
server.register(authRoutes, { prefix: "/auth" });

server.register(async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.get("/me", async (request, reply) => {
    reply.send({
      message: "User fetched successfully",
      user: request.user,
    });
  });

  app.get("/", async () => {
    return "This is senpai backend...";
  });
});

const bootstrap = async () => {
  try {
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
