import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Unit + integration projects (Phase 3).
 * `vitest.workspace.ts` re-exports this config for tools that look for a workspace file.
 * `unit-dom` uses `@vitejs/plugin-react` so component TSX can be imported under
 * the app's `jsx: "preserve"` tsconfig (Phase 14).
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
          exclude: ["tests/unit/components/**", "tests/unit/observability/**"],
          setupFiles: ["tests/setup/vitest.setup.ts"],
        },
      },
      {
        plugins: [react()],
        resolve: {
          alias: {
            "@": fileURLToPath(new URL("./", import.meta.url)),
          },
        },
        test: {
          name: "unit-dom",
          environment: "jsdom",
          include: [
            "tests/unit/components/**/*.test.ts",
            "tests/unit/observability/**/*.test.ts",
          ],
          setupFiles: ["tests/setup/vitest.setup.dom.ts"],
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
      include: ["lib/**/*.ts"],
      exclude: ["lib/**/*.d.ts", "lib/db/export-import/**", "lib/db/test/**"],
      thresholds: {
        // Phase 15: enforce a floor; automation-strategy 70% lib/ target is progressive.
        lines: 55,
        functions: 49,
        branches: 50,
        statements: 54,
      },
    },
  },
});
