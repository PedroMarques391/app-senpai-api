import { MongoInitializer } from "@/init";
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";
import { ANIME_USERS_DATA } from "./data/users.data";

export async function seedAnimeUsers(): Promise<void> {
  console.log("🌱 [Seed Anime Users] Conectando ao banco de dados...");
  await MongoInitializer.init();
  const db = MongoInitializer.getDb();
  const collection = db.collection("customers");

  const defaultPasswordHash = await bcrypt.hash("Senha123!", 10);
  console.log(
    "🔐 [Seed Anime Users] Senha padrão configurada para todos: 'Senha123!'",
  );

  const bulkOps = ANIME_USERS_DATA.map((char) => {
    const { anime: _anime, gender: _gender, ...userProps } = char;

    return {
      updateOne: {
        filter: { userName: userProps.userName },
        update: {
          $set: {
            ...userProps,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            _id: new ObjectId(),
            password: defaultPasswordHash,
            createdAt: new Date(),
            last_login: new Date(),
            storage_used_bytes: 0,
            total_xp: 1500,
            strikes: 0,
            stickers_count: { static: 12, dynamic: 5 },
            followers_count: 0,
            following_count: 0,
            activity: {
              current_streak: 7,
              weekly_active_days: [
                "segunda",
                "terça",
                "quarta",
                "quinta",
                "sexta",
              ],
            },
            achievements: [],
          },
        },
        upsert: true,
      },
    };
  });

  const result = await collection.bulkWrite(bulkOps);

  console.log("✅ [Seed Anime Users] Concluído com sucesso!");
  console.log(`   - Usuários inseridos: ${result.upsertedCount}`);
  console.log(`   - Usuários atualizados: ${result.modifiedCount}`);
  console.log(`   - Usuários correspondentes: ${result.matchedCount}`);
}

if (process.argv[1]?.endsWith("users.seed.ts")) {
  seedAnimeUsers()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ [Seed Anime Users] Erro ao executar seed:", err);
      process.exit(1);
    });
}
