import { MongoInitializer } from "@/init/database";
import { authRoutes } from "@/routes/auth";
import fastify from "fastify";

const server = fastify();

server.register(authRoutes, { prefix: "/auth" });

server.get("/", async () => {
  return "This is senpai backend...";
});

const bootstrap = async () => {
  try {
    await MongoInitializer.init();
    server.listen({ port: 3000 }, (err, address) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      console.log(`Server listening at ${address}`);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

bootstrap();
