import { afterEach, describe, expect, it } from "vitest";

import type { DeckBuilderDatabase } from "@/lib/db/database";
import { DeckCardRepository, DeckRepository } from "@/lib/db/repositories";
import { MAX_VERSIONS_PER_DECK } from "@/lib/versions/constants";
import {
  applySnapshot,
  captureSnapshot,
  deckCardsMatchSnapshot,
} from "@/lib/versions/snapshot";
import { VersionLimitError } from "@/lib/versions/types";
import { VersionService } from "@/lib/versions/version-service";
import { closeAndDelete, seedDeck } from "@/tests/helpers/db-test-utils";

describe("version service", () => {
  let database: DeckBuilderDatabase;

  afterEach(async () => {
    if (database) await closeAndDelete(database);
  });

  it("saveVersion creates a row and sets activeVersionId", async () => {
    const seeded = await seedDeck();
    database = seeded.database;
    const service = new VersionService(database);

    const version = await service.saveVersion(seeded.deck.id, {
      name: "v1 — Original",
      notes: "baseline",
    });

    expect(version.name).toBe("v1 — Original");
    expect(version.notes).toBe("baseline");
    expect(version.snapshot.deckCards).toHaveLength(1);
    expect(version.snapshot.deckCards[0]?.cardId).toBe(seeded.card.id);

    const deck = await new DeckRepository(database).getById(seeded.deck.id);
    expect(deck?.activeVersionId).toBe(version.id);

    const listed = await service.listVersions(seeded.deck.id);
    expect(listed).toHaveLength(1);
  });

  it("captureSnapshot + applySnapshot round-trip", async () => {
    const seeded = await seedDeck();
    database = seeded.database;
    const deckCards = new DeckCardRepository(database);

    await deckCards.add({
      deckId: seeded.deck.id,
      cardId: seeded.card.id,
      zone: "sideboard",
      status: "consider",
      quantity: 2,
      notes: "maybe",
    });

    const snapshot = await captureSnapshot(seeded.deck.id, database);
    expect(snapshot.deckCards.length).toBeGreaterThanOrEqual(2);
    expect(snapshot.deckCards.some((c) => c.zone === "sideboard")).toBe(true);
    expect(snapshot.deckCards.some((c) => c.status === "consider")).toBe(true);

    await deckCards.deleteByDeckId(seeded.deck.id);
    await applySnapshot(seeded.deck.id, snapshot, database);

    const restored = await deckCards.listByDeck(seeded.deck.id);
    expect(deckCardsMatchSnapshot(restored, snapshot)).toBe(true);
  });

  it("restoreVersion replaces deck cards atomically", async () => {
    const seeded = await seedDeck();
    database = seeded.database;
    const service = new VersionService(database);
    const deckCards = new DeckCardRepository(database);

    const v1 = await service.saveVersion(seeded.deck.id, { name: "v1" });

    await deckCards.add({
      deckId: seeded.deck.id,
      cardId: seeded.card.id,
      zone: "sideboard",
      status: "add",
      quantity: 3,
    });

    const beforeRestore = await deckCards.listByDeck(seeded.deck.id);
    expect(beforeRestore.length).toBeGreaterThan(1);

    await service.restoreVersion(seeded.deck.id, v1.id);

    const after = await deckCards.listByDeck(seeded.deck.id);
    expect(deckCardsMatchSnapshot(after, v1.snapshot)).toBe(true);

    const deck = await new DeckRepository(database).getById(seeded.deck.id);
    expect(deck?.activeVersionId).toBe(v1.id);
  });

  it("compareVersionToCurrent after live edit shows diff", async () => {
    const seeded = await seedDeck();
    database = seeded.database;
    const service = new VersionService(database);
    const deckCards = new DeckCardRepository(database);

    const v1 = await service.saveVersion(seeded.deck.id, { name: "v1" });
    await deckCards.update(seeded.deckCard.id, { quantity: 4 });

    const diff = await service.compareVersionToCurrent(seeded.deck.id, v1.id);
    expect(diff.quantityChanges).toHaveLength(1);
    expect(diff.quantityChanges[0]?.fromQuantity).toBe(1);
    expect(diff.quantityChanges[0]?.toQuantity).toBe(4);
  });

  it("deleteVersion removes record and clears activeVersionId", async () => {
    const seeded = await seedDeck();
    database = seeded.database;
    const service = new VersionService(database);

    const v1 = await service.saveVersion(seeded.deck.id, { name: "v1" });
    await service.deleteVersion(v1.id);

    expect(await service.getVersion(v1.id)).toBeUndefined();
    const deck = await new DeckRepository(database).getById(seeded.deck.id);
    expect(deck?.activeVersionId).toBeUndefined();
  });

  it("enforces MAX_VERSIONS_PER_DECK", async () => {
    const seeded = await seedDeck();
    database = seeded.database;
    const service = new VersionService(database);

    for (let i = 0; i < MAX_VERSIONS_PER_DECK; i += 1) {
      await service.saveVersion(seeded.deck.id, { name: `v${i + 1}` });
    }

    await expect(
      service.saveVersion(seeded.deck.id, { name: "overflow" }),
    ).rejects.toBeInstanceOf(VersionLimitError);

    const pruned = await service.saveVersion(seeded.deck.id, {
      name: "overflow",
      pruneOldest: true,
    });
    expect(pruned.name).toBe("overflow");
    const listed = await service.listVersions(seeded.deck.id);
    expect(listed).toHaveLength(MAX_VERSIONS_PER_DECK);
    expect(listed.some((v) => v.name === "v1")).toBe(false);
  });

  it("renameVersion updates metadata only", async () => {
    const seeded = await seedDeck();
    database = seeded.database;
    const service = new VersionService(database);
    const v1 = await service.saveVersion(seeded.deck.id, { name: "v1" });
    const snapshotBefore = JSON.stringify(v1.snapshot);

    const renamed = await service.renameVersion(v1.id, "v1 — renamed", "note");
    expect(renamed.name).toBe("v1 — renamed");
    expect(renamed.notes).toBe("note");
    expect(JSON.stringify(renamed.snapshot)).toBe(snapshotBefore);
  });

  it("compareVersions between two saved snapshots", async () => {
    const seeded = await seedDeck();
    database = seeded.database;
    const service = new VersionService(database);
    const deckCards = new DeckCardRepository(database);

    const v1 = await service.saveVersion(seeded.deck.id, { name: "v1" });
    await deckCards.update(seeded.deckCard.id, { status: "cut" });
    const v2 = await service.saveVersion(seeded.deck.id, { name: "v2" });

    const diff = await service.compareVersions(v1.id, v2.id);
    expect(diff.statusChanges).toHaveLength(1);
    expect(diff.statusChanges[0]?.fromStatus).toBe("current");
    expect(diff.statusChanges[0]?.toStatus).toBe("cut");
  });

  it("restore works while pending ADD/CUT changes exist", async () => {
    const seeded = await seedDeck();
    database = seeded.database;
    const service = new VersionService(database);
    const deckCards = new DeckCardRepository(database);

    const v1 = await service.saveVersion(seeded.deck.id, { name: "v1" });
    await deckCards.update(seeded.deckCard.id, { status: "cut" });
    await deckCards.add({
      deckId: seeded.deck.id,
      cardId: seeded.card.id,
      zone: "mainboard",
      status: "add",
      quantity: 1,
    });

    await service.restoreVersion(seeded.deck.id, v1.id);
    const after = await deckCards.listByDeck(seeded.deck.id);
    expect(after.every((r) => r.status === "current")).toBe(true);
    expect(deckCardsMatchSnapshot(after, v1.snapshot)).toBe(true);
  });

  it("full backup export/import preserves deckVersions", async () => {
    const seeded = await seedDeck();
    database = seeded.database;
    const service = new VersionService(database);
    const saved = await service.saveVersion(seeded.deck.id, {
      name: "v1 — export",
      notes: "keep me",
    });

    const { exportFullBackup } =
      await import("@/lib/import-export/export-full-backup");
    const { importFullBackup } =
      await import("@/lib/import-export/import-full-backup");
    const { clearAllData } = await import("@/lib/import-export/clear-all-data");

    const backup = await exportFullBackup(database);
    expect(backup.metadata.versionCount).toBe(1);
    expect(backup.data.deckVersions[0]?.name).toBe("v1 — export");

    await clearAllData(database);
    expect(await database.deckVersions.count()).toBe(0);

    await importFullBackup(backup, database);
    expect(await database.deckVersions.count()).toBe(1);
    const restored = await database.deckVersions.get(saved.id);
    expect(restored?.notes).toBe("keep me");
    expect(restored?.snapshot.deckCards).toHaveLength(1);
  });
});
