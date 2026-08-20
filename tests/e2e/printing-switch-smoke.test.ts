import { Selector } from "testcafe";

fixture("Printing switch smoke").page("http://localhost:3000/decks/new");

test("empty deck exposes the offline-safe bulk printing sheet", async (t) => {
  await t
    .typeText('[data-testid="deck-name-input"]', `Printing Smoke ${Date.now()}`)
    .click('[data-testid="deck-save-skip-commander-btn"]')
    .expect(Selector('[data-testid="bulk-cheapest-btn"]').exists)
    .ok()
    .click('[data-testid="bulk-cheapest-btn"]')
    .expect(Selector('[data-testid="bulk-cheapest-sheet"]').exists)
    .ok()
    .expect(Selector('[data-testid="bulk-cheapest-preview"]').exists)
    .ok()
    .expect(
      Selector('[data-testid="bulk-cheapest-apply-btn"]').hasAttribute(
        "disabled",
      ),
    )
    .ok();
});
