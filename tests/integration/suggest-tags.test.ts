import { afterEach, describe, expect, it } from "vitest";

import type { DeckBuilderDatabase } from "@/lib/db/database";
import { CardRepository, SettingsRepository } from "@/lib/db/repositories";
import { DeckCardService, DeckService } from "@/lib/deck/deck-service";
import {
  applyDeckTagSuggestions,
  previewDeckTagSuggestions,
} from "@/lib/tags/apply-suggestions";
import {
  closeAndDelete,
  MOCK_SOL_RING,
  resetDatabase,
  seedDeck,
} from "@/tests/helpers/db-test-utils";

describe("tag suggestions integration", () => {
  let database: DeckBuilderDatabase;

  afterEach(async () => {
    if (database) await closeAndDelete(database);
  });

  it("previews and applies cached-card suggestions offline", async () => {
    const seeded = await seedDeck();
    database = seeded.database;

    const preview = await previewDeckTagSuggestions(
      seeded.deck.id,
      "untagged",
      database,
    );
    expect(preview.rows).toHaveLength(1);
    expect(preview.rows[0]?.suggestedRoles).toContain("role.ramp");
    expect(preview.rows[0]?.suggestedSynergies).toContain("synergy.artifact");
    expect(preview.rows[0]?.reasons.length).toBeGreaterThan(0);

    const count = await applyDeckTagSuggestions(
      preview,
      [seeded.deckCard.id],
      database,
    );
    expect(count).toBe(1);

    const [updated] = await new DeckCardService(database).listByDeck(
      seeded.deck.id,
    );
    expect(updated?.roles).toContain("role.ramp");
    expect(updated?.synergies).toContain("synergy.artifact");
  });

  it("default bulk policy does not overwrite an already-tagged card", async () => {
    const seeded = await seedDeck();
    database = seeded.database;
    await new DeckCardService(database).setRoles(seeded.deckCard.id, [
      "role.tutor",
    ]);

    const preview = await previewDeckTagSuggestions(
      seeded.deck.id,
      "untagged",
      database,
    );
    expect(preview.rows).toEqual([]);
    expect(preview.skippedTagged).toBe(1);

    const [unchanged] = await new DeckCardService(database).listByDeck(
      seeded.deck.id,
    );
    expect(unchanged?.roles).toEqual(["role.tutor"]);
  });

  it("fill-empty preserves roles while filling an empty synergy group", async () => {
    const seeded = await seedDeck();
    database = seeded.database;
    await new DeckCardService(database).setRoles(seeded.deckCard.id, [
      "role.tutor",
    ]);

    const preview = await previewDeckTagSuggestions(
      seeded.deck.id,
      "fill-empty",
      database,
    );
    expect(preview.rows[0]?.nextRoles).toEqual(["role.tutor"]);
    expect(preview.rows[0]?.nextSynergies).toContain("synergy.artifact");
  });

  it("suggests on add by default and respects the disabled setting", async () => {
    database = await resetDatabase();
    const card = await new CardRepository(database).upsert(MOCK_SOL_RING);
    const deck = await new DeckService(database).createDeck({
      name: "Suggestions",
      format: "commander",
    });
    const service = new DeckCardService(database);

    const suggested = await service.addCardToDeck({
      deckId: deck.id,
      cardId: card.id,
    });
    expect(suggested.suggestedTagIds).toEqual(
      expect.arrayContaining(["role.ramp", "synergy.artifact"]),
    );

    await new SettingsRepository(database).set("tags.suggestOnAdd", false);
    const secondDeck = await new DeckService(database).createDeck({
      name: "No suggestions",
      format: "commander",
    });
    const plain = await service.addCardToDeck({
      deckId: secondDeck.id,
      cardId: card.id,
    });
    expect(plain.suggestedTagIds).toEqual([]);
    expect(plain.deckCard.roles).toEqual([]);
    expect(plain.deckCard.synergies).toEqual([]);
  });
});
