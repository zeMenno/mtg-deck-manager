import { describe, expect, it } from "vitest";

import {
  ScryfallNotFoundError,
  ScryfallRateLimitError,
  getCardById,
  getCardsByIds,
  searchCards,
} from "@/lib/scryfall/client";
import {
  mockRateLimitTimes,
  mockServerErrorTimes,
} from "@/tests/mocks/scryfall-handlers";
import { FIXTURE_SOL_RING } from "@/tests/fixtures/scryfall-cards";

describe("scryfall client", () => {
  it("searches cards via MSW (no live API)", async () => {
    const result = await searchCards("Sol Ring");
    expect(result.object).toBe("list");
    expect(result.data.some((c) => c.name === "Sol Ring")).toBe(true);
  });

  it("fetches a card by printing id", async () => {
    const card = await getCardById(FIXTURE_SOL_RING.id);
    expect(card.id).toBe(FIXTURE_SOL_RING.id);
    expect(card.oracle_id).toBe(FIXTURE_SOL_RING.oracle_id);
  });

  it("throws ScryfallNotFoundError for unknown id", async () => {
    await expect(getCardById("missing-id-zzzz")).rejects.toBeInstanceOf(
      ScryfallNotFoundError,
    );
  });

  it("retries on 429 then succeeds", async () => {
    mockRateLimitTimes(1);
    const result = await searchCards("Sol");
    expect(result.data.length).toBeGreaterThan(0);
  });

  it("retries on 5xx then succeeds", async () => {
    mockServerErrorTimes(1);
    const result = await searchCards("Sol");
    expect(result.data.length).toBeGreaterThan(0);
  });

  it("batches collection fetches", async () => {
    const cards = await getCardsByIds([
      FIXTURE_SOL_RING.id,
      "missing-printing",
    ]);
    expect(cards).toHaveLength(1);
    expect(cards[0]!.id).toBe(FIXTURE_SOL_RING.id);
  });

  it("surfaces rate limit error after exhausting retries", async () => {
    mockRateLimitTimes(5);
    await expect(searchCards("Sol")).rejects.toBeInstanceOf(
      ScryfallRateLimitError,
    );
  });
});
