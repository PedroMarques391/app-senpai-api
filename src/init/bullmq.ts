import { createNodeRedisClient, type RedisClient } from "bullmq";
import { createClient, type RedisClientType } from "redis";

export class BullMQInitializer {
  private static client: RedisClient | null = null;
  private static rawClient: RedisClientType | null = null;

  public static connect(): RedisClient {
    if (!this.client) {
      this.rawClient = createClient({
        url: process.env.REDIS_URL,
      });

      this.rawClient.on("error", (err) => {
        console.error("❌ BullMQ Redis error:", err);
      });

      this.client = createNodeRedisClient(this.rawClient);
    }

    return this.client;
  }

  public static async disconnect(): Promise<void> {
    if (this.rawClient && this.rawClient.isOpen) {
      await this.rawClient.quit();
      this.rawClient = null;
      this.client = null;
    }
  }
}

export default BullMQInitializer;
