import { describe, expect, it } from "vitest";

import { CardRepository } from "@/lib/db/repositories";
import { normalizeScryfallCard } from "@/lib/scryfall";
import { closeAndDelete, resetDatabase } from "@/tests/helpers/db-test-utils";
import {
  FIXTURE_NO_IMAGE,
  FIXTURE_SOL_RING,
} from "@/tests/fixtures/scryfall-cards";

describe("CardRepository Phase 4 extensions", () => {
  it("searchLocal matches substring on name (not only prefix)", async () => {
    const database = await resetDatabase();
    const repo = new CardRepository(database);
    await repo.upsert(normalizeScryfallCard(FIXTURE_SOL_RING));

    const hits = await repo.searchLocal("ring");
    expect(hits).toHaveLength(1);
    expect(hits[0]!.name).toBe("Sol Ring");

    await closeAndDelete(database);
  });

  it("searchLocal can match oracle text", async () => {
    const database = await resetDatabase();
    const repo = new CardRepository(database);
    await repo.upsert(normalizeScryfallCard(FIXTURE_SOL_RING));

    const hits = await repo.searchLocal("{C}{C}");
    expect(hits.some((c) => c.name === "Sol Ring")).toBe(true);

    await closeAndDelete(database);
  });

  it("bulkUpsert writes many cards", async () => {
    const database = await resetDatabase();
    const repo = new CardRepository(database);
    await repo.bulkUpsert([
      normalizeScryfallCard(FIXTURE_SOL_RING),
      normalizeScryfallCard(FIXTURE_NO_IMAGE),
    ]);

    const all = await repo.getAll();
    expect(all.length).toBeGreaterThanOrEqual(2);

    await closeAndDelete(database);
  });

  it("getByOracleId returns all printings", async () => {
    const database = await resetDatabase();
    const repo = new CardRepository(database);
    const base = normalizeScryfallCard(FIXTURE_SOL_RING);
    await repo.bulkUpsert([
      base,
      {
        ...base,
        id: "printing-two",
        setCode: "cmr",
        setName: "Commander Legends",
      },
    ]);

    const printings = await repo.getByOracleId(base.oracleId);
    expect(printings).toHaveLength(2);

    await closeAndDelete(database);
  });
});
