import path from "node:path";

import {
  cloudflareTest,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
  const migrations = await readD1Migrations(
    path.resolve(__dirname, "../../packages/db/migrations"),
  );

  return {
    resolve: { alias: { "@": path.resolve(__dirname) } },
    plugins: [
      cloudflareTest({
        miniflare: {
          compatibilityDate: "2026-07-14",
          compatibilityFlags: ["nodejs_compat"],
          d1Databases: ["DB"],
          bindings: { TEST_MIGRATIONS: migrations },
        },
      }),
    ],
    test: { setupFiles: ["./test/apply-migrations.ts"] },
  };
});
