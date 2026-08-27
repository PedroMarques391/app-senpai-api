import { Db, MongoClient } from "mongodb";

export class MongoInitializer {
  private static client: MongoClient | null = null;
  private static db: Db | null = null;

  public static async init(): Promise<void> {
    if (this.client) {
      return;
    }

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

      await this.db.collection("stickerPacks").createIndex({ user_id: 1 });
      await this.db.collection("stickerPacks").createIndex({ category: 1 });
      await this.db.collection("stickerPacks").createIndex({ tags: 1 });
      await this.db.collection("stickerPacks").createIndex({ created_at: -1 });

      await this.db.collection("stickers").createIndex({ user_id: 1, type: 1 });
      await this.db.collection("stickers").createIndex({ pack_id: 1 });

      await this.db.collection("store_items").createIndex({ is_active: 1 });

      await this.db
        .collection("user_items")
        .createIndex({ user_id: 1, item_id: 1 }, { unique: true });
      await this.db
        .collection("user_items")
        .createIndex({ user_id: 1, item_type: 1 });
      await this.db
        .collection("user_items")
        .createIndex({ user_id: 1, acquired_at: -1 });

      await this.db
        .collection("daily_missions")
        .createIndex({ mission_key: 1 }, { unique: true });

      console.log("✅ Successfully connected to MongoDB");
    } catch (error) {
      console.error("❌ Failed to connect to MongoDB");
      throw error;
    }
  }

  public static getDb(): Db {
    if (!this.db) {
      throw new Error(
        "Database not initialized. Call MongoInitializer.init() first.",
      );
    }
    return this.db;
  }

  public static getClient(): MongoClient {
    if (!this.client) {
      throw new Error(
        "Database client not initialized. Call MongoInitializer.init() first.",
      );
    }
    return this.client;
  }

  public static async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      console.log("🔌 MongoDB connection closed");
    }
  }
}
