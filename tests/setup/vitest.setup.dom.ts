/**
 * DOM component test setup (Phase 14) — no MSW node server.
 */
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
