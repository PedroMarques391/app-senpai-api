import { ServiceFactory } from "@/factories";
import { BullMQInitializer, MongoInitializer } from "@/init";
import { PackRepository, StickerRepository } from "@/repositories";
import { MediaWorker } from "@/workers";
import http from "node:http";
import { createClient } from "redis";

async function bootstrap() {
  try {
    console.log("⏳ Inicializando conexões do Worker...");

    await MongoInitializer.init();

    const redisClient = createClient({ url: process.env.REDIS_URL });
    await redisClient.connect();
    console.log("Redis conectado com sucesso no Worker");

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
    );

    console.log("Media Worker inicializado e pronto para processar filas!");

    const port = Number(process.env.PORT);
    const healthServer = http.createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "healthy", service: "media-worker" }));
    });

    healthServer.listen(port, "0.0.0.0", () => {
      console.log(`Healthcheck HTTP ativo na porta ${port}`);
    });

    const shutdown = async () => {
      console.log("Finalizando Media Worker...");
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
    console.error("Falha crítica ao inicializar Media Worker:", err);
    process.exit(1);
  }
}

bootstrap();
