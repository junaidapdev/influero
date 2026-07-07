import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

// Standalone test config (not merged with vite.config.ts) so the React and
// Tailwind build plugins never load for pure-function tests. Node environment:
// the test surface is features/* logic, which is React-free by boundary rule.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@shared": fileURLToPath(new URL("../backend/shared", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
