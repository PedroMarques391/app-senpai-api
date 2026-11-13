import { FASTIFY_LOGGER_CONFIG } from "@/constants";
import { ServiceFactory } from "@/factories";
import { BullMQInitializer, MongoInitializer } from "@/init";
import { PackRepository, StickerRepository } from "@/repositories";
import { MediaWorker } from "@/workers";
import fastify from "fastify";
import { createClient } from "redis";

const server = fastify({
  logger: FASTIFY_LOGGER_CONFIG,
});

const healthResponse = { status: "healthy", service: "media-worker" };

server.get("/", { logLevel: "silent" }, async () => healthResponse);
server.get("/health", { logLevel: "silent" }, async () => healthResponse);

async function bootstrap() {
  try {
    server.log.info("⏳ Inicializando conexões do Worker...");

    BullMQInitializer.setLogger(server.log);
    await MongoInitializer.init(server.log);

    const redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on("error", (err) => {
      server.log.error({ err }, "Erro no Redis do Worker");
    });
    await redisClient.connect();
    server.log.info("Redis conectado com sucesso no Worker");

    const cacheService = ServiceFactory.getCacheService(redisClient as any);
    const storageProvider = ServiceFactory.getCloudFlareR2Provider();
    const sharpService = ServiceFactory.getSharpService();
    const stickerRepository = new StickerRepository();
    const packRepository = new PackRepository();

    const mediaWorker = new MediaWorker(
      storageProvider,
      sharpService,
      stickerRepository,
      packRepository,
      cacheService,
      server.log,
    );

    const address = await server.listen({
      port: Number(process.env.PORT) || 0,
      host: "0.0.0.0",
    });

    server.log.info(
      `Media Worker inicializado e pronto para processar filas (${address})`,
    );

    const shutdown = async () => {
      server.log.info("Finalizando Media Worker...");
      await server.close();
      await mediaWorker.close();
      await redisClient.destroy();
      await BullMQInitializer.disconnect();
      await MongoInitializer.close();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (err) {
    server.log.error({ err }, "Falha crítica ao inicializar Media Worker");
    process.exit(1);
  }
}

bootstrap();
