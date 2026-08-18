import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Phase 1 ships a single `unit` project so `test:unit --project unit` is stable
 * from the start. Phase 3 adds an `integration` project (fake-indexeddb) here.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    projects: [
      {
        resolve: {
          alias: {
            "@": fileURLToPath(new URL("./", import.meta.url)),
          },
        },
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
          setupFiles: ["tests/setup/vitest.setup.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["lib/**/*.ts", "types/**/*.ts"],
    },
  },
});
