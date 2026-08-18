import { Selector } from "testcafe";

fixture("Deck CRUD smoke").page("http://localhost:3000/decks/new");

test("Create deck persists after reload", async (t) => {
  const deckName = `Test Soldiers ${Date.now()}`;

  await t
    .typeText('[data-testid="deck-name-input"]', deckName)
    .click('[data-testid="deck-save-skip-commander-btn"]');

  await t.expect(Selector('[data-testid="deck-header"]').exists).ok();

  await t.navigateTo("http://localhost:3000/decks");

  await t
    .expect(Selector('[data-testid="deck-item"]').withText(deckName).exists)
    .ok();
});
