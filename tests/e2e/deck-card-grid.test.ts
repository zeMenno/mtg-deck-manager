import { Selector } from "testcafe";

fixture("Deck card grid").page("http://localhost:3000/decks/new");

test("grid density is selectable on the cards page", async (t) => {
  await t
    .typeText('[data-testid="deck-name-input"]', `Grid Smoke ${Date.now()}`)
    .click('[data-testid="deck-save-skip-commander-btn"]')
    .click('[data-testid="deck-tab-cards"]')
    .expect(Selector('[data-testid="density-grid"]').exists)
    .ok()
    .click('[data-testid="density-grid"]')
    .expect(Selector('[data-testid="effective-density-label"]').innerText)
    .contains("grid");
});
