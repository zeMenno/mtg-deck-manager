import { describe, expect, it } from "vitest";

import {
  SCRYFALL_BASE,
  USER_AGENT,
  autocompleteUrl,
  cardByIdUrl,
  cardBySetCollectorUrl,
  cardsCollectionUrl,
  searchCardsUrl,
} from "@/lib/scryfall/endpoints";

describe("scryfall endpoints", () => {
  it("exports base URL and user agent", () => {
    expect(SCRYFALL_BASE).toBe("https://api.scryfall.com");
    expect(USER_AGENT).toContain("MTGDeckBuilder");
  });

  it("builds search URL with unique=cards by default and encoded query", () => {
    const url = searchCardsUrl("Lightning Bolt");
    expect(url).toContain(`${SCRYFALL_BASE}/cards/search?`);
    expect(url).toContain("q=Lightning+Bolt");
    expect(url).toContain("unique=cards");
  });

  it("allows unique=prints and page", () => {
    const url = searchCardsUrl("sol ring", { unique: "prints", page: 2 });
    expect(url).toContain("unique=prints");
    expect(url).toContain("page=2");
  });

  it("builds card by id URL", () => {
    expect(cardByIdUrl("abc-123")).toBe(`${SCRYFALL_BASE}/cards/abc-123`);
  });

  it("builds card by set and collector number URL", () => {
    expect(cardBySetCollectorUrl("CMM", "396")).toBe(
      `${SCRYFALL_BASE}/cards/cmm/396`,
    );
  });

  it("builds collection and autocomplete URLs", () => {
    expect(cardsCollectionUrl()).toBe(`${SCRYFALL_BASE}/cards/collection`);
    expect(autocompleteUrl("sol")).toContain("/cards/autocomplete?");
    expect(autocompleteUrl("sol")).toContain("q=sol");
  });
});
