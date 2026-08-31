import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { createClient } from "redis";

async function redisPlugin(fastify: FastifyInstance) {
  const redis: ReturnType<typeof createClient> = createClient({
    url: process.env.REDIS_URL,
  });

  redis.on("error", (err) => {
    fastify.log.error(err, "❌ Redis error");
  });

  redis.on("connect", () => {
    console.log("✅ Redis connected");
  });

  await redis.connect();

  fastify.decorate("redis", redis);

  fastify.addHook("onClose", async () => {
    if (redis.isOpen) {
      await redis.quit();
    }
  });
}

export default fp(redisPlugin);
