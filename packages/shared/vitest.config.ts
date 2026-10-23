import { defineConfig } from "vitest/config";

export default defineConfig({
  ssr: { resolve: { conditions: ["react-server"] } },
  test: { server: { deps: { inline: ["server-only"] } } },
});
