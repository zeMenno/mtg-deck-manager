import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Unit + integration projects (Phase 3).
 * `vitest.workspace.ts` re-exports this config for tools that look for a workspace file.
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
      {
        resolve: {
          alias: {
            "@": fileURLToPath(new URL("./", import.meta.url)),
          },
        },
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
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
