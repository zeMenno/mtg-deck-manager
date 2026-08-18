import { describe, expect, it } from "vitest";

import { CardRepository } from "@/lib/db/repositories";
import {
  getCardById,
  normalizeScryfallCard,
  searchCards,
} from "@/lib/scryfall";
import { closeAndDelete, resetDatabase } from "@/tests/helpers/db-test-utils";
import {
  FIXTURE_SOL_RING,
  FIXTURE_TRANSFORM_DFC,
} from "@/tests/fixtures/scryfall-cards";

describe("scryfall search → Dexie cache", () => {
  it("search upserts results and getById reads them back", async () => {
    const database = await resetDatabase();
    const cards = new CardRepository(database);

    const result = await searchCards("Sol Ring");
    const normalized = result.data.map(normalizeScryfallCard);
    await cards.bulkUpsert(normalized);

    const stored = await cards.getById(FIXTURE_SOL_RING.id);
    expect(stored).toBeDefined();
    expect(stored!.name).toBe("Sol Ring");
    expect(stored!.oracleId).toBe(FIXTURE_SOL_RING.oracle_id);
    expect(stored!.id).toBe(FIXTURE_SOL_RING.id);

    const local = await cards.searchLocal("sol");
    expect(local.some((c) => c.id === FIXTURE_SOL_RING.id)).toBe(true);

    await closeAndDelete(database);
  });

  it("getCardById → normalize → upsert → offline getById", async () => {
    const database = await resetDatabase();
    const repo = new CardRepository(database);

    const raw = await getCardById(FIXTURE_TRANSFORM_DFC.id);
    const card = normalizeScryfallCard(raw);
    await repo.upsert(card);

    const cached = await repo.getById(FIXTURE_TRANSFORM_DFC.id);
    expect(cached?.faces).toHaveLength(2);
    expect(cached?.faces?.[0]?.oracleText).toContain("transform");
    expect(cached?.faces?.[1]?.name).toBe("Insectile Aberration");

    const byOracle = await repo.getByOracleId(FIXTURE_TRANSFORM_DFC.oracle_id!);
    expect(byOracle).toHaveLength(1);
    expect(byOracle[0]!.id).toBe(FIXTURE_TRANSFORM_DFC.id);

    await closeAndDelete(database);
  });

  it("searchLocal finds partial name matches after cache populate", async () => {
    const database = await resetDatabase();
    const repo = new CardRepository(database);

    const result = await searchCards("Giant");
    await repo.bulkUpsert(result.data.map(normalizeScryfallCard));

    const hits = await repo.searchLocal("bone");
    expect(hits.some((c) => c.name.includes("Bonecrusher"))).toBe(true);

    await closeAndDelete(database);
  });

  it("getStaleIds returns cards older than threshold", async () => {
    const database = await resetDatabase();
    const repo = new CardRepository(database);

    await repo.upsert({
      ...normalizeScryfallCard(FIXTURE_SOL_RING),
      updatedAt: "2020-01-01T00:00:00.000Z",
    });

    const stale = await repo.getStaleIds(30);
    expect(stale).toContain(FIXTURE_SOL_RING.id);

    await closeAndDelete(database);
  });
});
