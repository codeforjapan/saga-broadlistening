import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    // 統合テストは実 Supabase に繋ぐため、別 config（vitest.integration.config.mts）で走らせる
    exclude: ["**/*.integration.test.ts", "**/node_modules/**"],
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
