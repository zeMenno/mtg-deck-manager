/**
 * Global Vitest setup — fake-indexeddb + MSW Scryfall mock (Phase 4).
 */
import "fake-indexeddb/auto";

import { afterAll, afterEach, beforeAll } from "vitest";
import { setupServer } from "msw/node";

import {
  resetScryfallMockState,
  scryfallHandlers,
} from "@/tests/mocks/scryfall-handlers";
import { resetRateLimiter, resetScryfallClientConfig } from "@/lib/scryfall";

export const scryfallServer = setupServer(...scryfallHandlers);

beforeAll(() => {
  scryfallServer.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  scryfallServer.resetHandlers();
  resetScryfallMockState();
  resetRateLimiter();
  resetScryfallClientConfig();
});

afterAll(() => {
  scryfallServer.close();
});
