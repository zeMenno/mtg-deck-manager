import { afterEach, describe, expect, it } from "vitest";

import type { DeckBuilderDatabase } from "@/lib/db/database";
import { DeckCardService } from "@/lib/deck/deck-service";
import { closeAndDelete, seedDeck } from "@/tests/helpers/db-test-utils";
import type { DeckCardStatus } from "@/types";

const CYCLE: DeckCardStatus[] = ["current", "add", "cut", "consider"];

describe("deck card status", () => {
  let database: DeckBuilderDatabase;

  afterEach(async () => {
    if (database) {
      await closeAndDelete(database);
    }
  });

  it("persists status transitions and quantity updates", async () => {
    const seeded = await seedDeck();
    database = seeded.database;
    const service = new DeckCardService(database);

    let current = seeded.deckCard;
    for (const status of CYCLE) {
      current = await service.setStatus(current.id, status);
      expect(current.status).toBe(status);
    }

    current = await service.setQuantity(current.id, 3);
    expect(current.quantity).toBe(3);

    const listed = await service.listByDeck(seeded.deck.id, "consider");
    expect(listed).toHaveLength(1);
    expect(listed[0]?.quantity).toBe(3);
  });
});
