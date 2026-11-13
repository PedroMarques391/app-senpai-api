import { ServiceFactory } from "@/factories";
import {
  BullMQInitializer,
  LoggerInitializer,
  MongoInitializer,
} from "@/init";
import { PackRepository, StickerRepository } from "@/repositories";
import { MediaWorker } from "@/workers";
import http from "node:http";
import { createClient } from "redis";

async function bootstrap() {
  const logger = LoggerInitializer.init();

  try {
    logger.info("⏳ Inicializando conexões do Worker...");

    BullMQInitializer.setLogger(logger);
    await MongoInitializer.init(logger);

    const redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on("error", (err) => {
      logger.error({ err }, "Erro no Redis do Worker");
    });
    await redisClient.connect();
    logger.info("Redis conectado com sucesso no Worker");

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
      logger,
    );

    logger.info("Media Worker inicializado e pronto para processar filas!");

    const port = Number(process.env.PORT);
    const healthServer = http.createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "healthy", service: "media-worker" }));
    });

    healthServer.listen(port, "0.0.0.0", () => {
      const address = healthServer.address();
      const listeningPort =
        typeof address === "object" && address ? address.port : port;
      logger.info(
        { port: listeningPort },
        `Healthcheck HTTP ativo na porta ${listeningPort}`,
      );
    });

    const shutdown = async () => {
      logger.info("Finalizando Media Worker...");
      healthServer.close();
      await mediaWorker.close();
      await redisClient.destroy();
      await BullMQInitializer.disconnect();
      await MongoInitializer.close();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (err) {
    logger.error({ err }, "Falha crítica ao inicializar Media Worker");
    process.exit(1);
  }
}

bootstrap();
