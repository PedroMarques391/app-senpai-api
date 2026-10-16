import { MongoInitializer } from "@/init";
import { OFFICIAL_STORE_ITEMS } from "./data/store-items.data";

export async function seedStoreCatalog(): Promise<void> {
  console.log("🌱 [Seed Catalog] Conectando ao banco de dados...");
  await MongoInitializer.init();
  const db = MongoInitializer.getDb();
  const collection = db.collection("store_items");

  console.log(
    `📦 [Seed Catalog] Processando ${OFFICIAL_STORE_ITEMS.length} itens oficiais da loja...`,
  );

  const bulkOps = OFFICIAL_STORE_ITEMS.map((item) => ({
    updateOne: {
      filter: { code: item.code },
      update: {
        $set: {
          code: item.code,
          name: item.name,
          description: item.description,
          type: item.type,
          price_in_petals: item.price_in_petals,
          status: item.status,
          updated_at: new Date(),
        },
        $setOnInsert: {
          created_at: new Date(),
          purchases_count: 0,
        },
      },
      upsert: true,
    },
  }));

  const result = await collection.bulkWrite(bulkOps);

  console.log(`✅ [Seed Catalog] Concluído com sucesso!`);
  console.log(`   - Itens inseridos: ${result.upsertedCount}`);
  console.log(`   - Itens atualizados: ${result.modifiedCount}`);
  console.log(`   - Itens correspondentes: ${result.matchedCount}`);
}

// Execução direta via CLI
if (process.argv[1]?.endsWith("store-catalog.seed.ts")) {
  seedStoreCatalog()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ [Seed Catalog] Erro ao executar seed:", err);
      process.exit(1);
    });
}
