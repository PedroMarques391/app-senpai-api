import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",
  format: ["esm"],
  target: "node22",
  bundle: true,
  sourcemap: true,
  clean: true,
  splitting: false,
});
