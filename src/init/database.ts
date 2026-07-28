import { Db, MongoClient } from "mongodb";

export class MongoInitializer {
  private static client: MongoClient;
  private static db: Db;

  public static async init(): Promise<void> {
    const uri = process.env.MONGO_URI;

    if (!uri) {
      throw new Error("MONGO_URI environment variable is not defined");
    }

    try {
      this.client = new MongoClient(uri);
      await this.client.connect();

      this.db = this.client.db();

      await this.db
        .collection("customers")
        .createIndex({ wa_id: 1 }, { unique: true });
      await this.db
        .collection("customers")
        .createIndex({ email: 1 }, { unique: true, sparse: true });
      await this.db
        .collection("customers")
        .createIndex({ userName: 1 }, { unique: true, sparse: true });

      console.log("✅ Successfully connected to MongoDB");
    } catch (error) {
      console.error("❌ Failed to connect to MongoDB");
      throw error;
    }
  }

  public static getDb(): Db {
    if (!this.db) {
      throw new Error("Database not initialized. Call Mongo.init() first.");
    }
    return this.db;
  }

  public static getClient(): MongoClient {
    if (!this.client) {
      throw new Error(
        "Database client not initialized. Call Mongo.init() first.",
      );
    }
    return this.client;
  }
}
