import { describe, expect, it } from "vitest";

import { collectDeckImageUrls } from "@/lib/pwa/prefetch-deck-images";
import type { Card } from "@/types/card";

function card(partial: Partial<Card> & Pick<Card, "id" | "name">): Card {
  return {
    oracleId: "o",
    manaValue: 1,
    typeLine: "Artifact",
    colors: [],
    colorIdentity: [],
    keywords: [],
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("collectDeckImageUrls", () => {
  it("dedupes allowed Scryfall normal URLs", () => {
    const shared = "https://cards.scryfall.io/normal/front/a.jpg";
    const urls = collectDeckImageUrls([
      {
        card: card({
          id: "1",
          name: "A",
          imageNormal: shared,
          imageSmall: "https://cards.scryfall.io/small/front/a.jpg",
        }),
      },
      {
        card: card({
          id: "2",
          name: "B",
          imageNormal: shared,
        }),
      },
      {
        card: card({
          id: "3",
          name: "C",
          imageSmall: "https://evil.example/x.jpg",
        }),
      },
    ]);

    expect(urls).toEqual([shared]);
  });

  it("falls back to small when normal is missing", () => {
    const small = "https://cards.scryfall.io/small/front/b.jpg";
    expect(
      collectDeckImageUrls([
        { card: card({ id: "1", name: "B", imageSmall: small }) },
      ]),
    ).toEqual([small]);
  });
});
