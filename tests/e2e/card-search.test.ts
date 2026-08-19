import { Selector } from "testcafe";

/**
 * Card search shell — verifies search page affordances.
 * Live Scryfall results are covered by MSW unit/integration tests.
 */
fixture("Card search").page("http://localhost:3000/cards");

test("Search page shows input and empty guidance", async (t) => {
  await t.expect(Selector('[data-testid="card-search-input"]').exists).ok();
  await t.expect(Selector("h1").withText(/search cards/i).exists).ok();
  await t.expect(Selector("body").textContent).match(/at least 2 characters/i);
});

test("Search input accepts a query without crashing", async (t) => {
  await t
    .typeText('[data-testid="card-search-input"]', "Sol")
    .expect(Selector('[data-testid="card-search-input"]').value)
    .eql("Sol");
});
