import { MongoInitializer } from "@/init";

async function bootstrap() {
  await MongoInitializer.init();
  console.log("🚀 Media Worker rodando com sucesso!");
}

bootstrap();
