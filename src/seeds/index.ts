import { seedStoreCatalog } from "./store-catalog.seed";

export async function runAllSeeds(): Promise<void> {
  console.log("🚀 [Master Seed] Iniciando todos os seeds do sistema...");
  await seedStoreCatalog();
  console.log("🏁 [Master Seed] Todos os seeds foram finalizados com sucesso.");
}

// Execução direta via CLI
if (process.argv[1]?.endsWith("seeds/index.ts") || process.argv[1]?.endsWith("seeds")) {
  runAllSeeds()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ [Master Seed] Erro geral na execução dos seeds:", err);
      process.exit(1);
    });
}

export * from "./store-catalog.seed";
export * from "./data/store-items.data";
