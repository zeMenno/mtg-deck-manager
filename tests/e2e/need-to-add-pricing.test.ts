import { Selector } from "testcafe";

/**
 * Need-to-Add pricing smoke — opens changes/add and asserts summary + refresh UI.
 * Price values may be unavailable without seeded cache; presence of labels is enough.
 */
fixture("Need-to-Add pricing").page("http://localhost:3000/decks/new");

test("Need-to-Add summary shows cost segment", async (t) => {
  const deckName = `Pricing Flow ${Date.now()}`;

  await t
    .typeText('[data-testid="deck-name-input"]', deckName)
    .click('[data-testid="deck-save-skip-commander-btn"]');

  await t.expect(Selector('[data-testid="deck-header"]').exists).ok();
  await t.click('[data-testid="deck-tab-changes"]');
  await t.click('[data-testid="changes-nav-add"]');

  await t.expect(Selector('[data-testid="need-to-add-list"]').exists).ok();
  await t.expect(Selector('[data-testid="need-to-add-summary"]').exists).ok();
  await t
    .expect(Selector('[data-testid="need-to-add-summary"]').textContent)
    .contains("Est. cost");
  await t.expect(Selector('[data-testid="refresh-prices-btn"]').exists).ok();
});
