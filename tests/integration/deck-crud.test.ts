import { afterEach, describe, expect, it } from "vitest";

import { DeckBuilderDatabase } from "@/lib/db/database";
import { DeckService } from "@/lib/deck/deck-service";
import {
  closeAndDelete,
  resetDatabase,
  uniqueDbName,
} from "@/tests/helpers/db-test-utils";

describe("deck CRUD", () => {
  let database: DeckBuilderDatabase;

  afterEach(async () => {
    if (database) {
      await closeAndDelete(database);
    }
  });

  it("creates, renames, lists, and cascade-deletes deck cards", async () => {
    database = await resetDatabase();
    const service = new DeckService(database);

    const created = await service.createDeck({
      name: "Soldiers",
      format: "commander",
    });
    expect(created.id).toBeTruthy();
    expect(created.name).toBe("Soldiers");

    const renamed = await service.renameDeck(created.id, "Elite Soldiers");
    expect(renamed.name).toBe("Elite Soldiers");

    // Simulate "reload" by opening a new instance against the same DB name.
    const name = database.name;
    database.close();
    const reopened = new DeckBuilderDatabase(name);
    await reopened.open();
    database = reopened;

    const listed = await new DeckService(reopened).listDecks();
    expect(listed).toHaveLength(1);
    expect(listed[0]?.name).toBe("Elite Soldiers");

    await reopened.deckCards.add({
      id: crypto.randomUUID(),
      deckId: created.id,
      cardId: "card-1",
      quantity: 1,
      zone: "mainboard",
      status: "current",
      roles: [],
      synergies: [],
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await new DeckService(reopened).deleteDeck(created.id);
    expect(await reopened.decks.count()).toBe(0);
    expect(await reopened.deckCards.count()).toBe(0);
  });

  it("rejects empty deck names", async () => {
    database = await resetDatabase({ name: uniqueDbName() });
    const service = new DeckService(database);
    await expect(
      service.createDeck({ name: "   ", format: "commander" }),
    ).rejects.toThrow(/name/i);
  });
});
