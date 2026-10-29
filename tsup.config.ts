import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/worker.ts"],
  outDir: "dist",
  format: ["esm"],
  target: "node26",
  bundle: true,
  sourcemap: true,
  clean: true,
  splitting: false,
});
