import { afterEach, describe, expect, it, vi } from "vitest";

import { CardRepository } from "@/lib/db/repositories";
import { DeckService } from "@/lib/deck/deck-service";
import { seedDeck } from "@/tests/helpers/db-test-utils";

/**
 * Offline-hardening: local deck mutations must succeed when fetch is unavailable.
 */
describe("offline deck edit", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renames a deck and persists while fetch is offline", async () => {
    const { database, deck } = await seedDeck();
    const service = new DeckService(database);

    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("offline"))),
    );

    const updated = await service.updateDeck(deck.id, {
      name: "Offline Rename",
    });
    expect(updated.name).toBe("Offline Rename");

    const reloaded = await service.getDeck(deck.id);
    expect(reloaded?.name).toBe("Offline Rename");
  });

  it("reads cached cards without network", async () => {
    const { database, card } = await seedDeck();

    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("offline"))),
    );

    const cards = new CardRepository(database);
    const found = await cards.getById(card.id);
    expect(found?.name).toBe(card.name);
    expect(fetch).not.toHaveBeenCalled();
  });
});
