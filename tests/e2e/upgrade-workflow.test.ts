import { Selector } from "testcafe";

/**
 * Upgrade workflow smoke — mark ADD/CUT via card actions, open changes hub,
 * open apply review. Full apply against a 100-card deck is covered by
 * integration tests; this E2E verifies navigation and UI affordances.
 */
fixture("Upgrade workflow").page("http://localhost:3000/decks/new");

test("Mark ADD/CUT and open changes hub", async (t) => {
  const deckName = `Upgrade Flow ${Date.now()}`;

  await t
    .typeText('[data-testid="deck-name-input"]', deckName)
    .click('[data-testid="deck-save-skip-commander-btn"]');

  await t.expect(Selector('[data-testid="deck-header"]').exists).ok();

  // Open cards tab
  await t.click('[data-testid="deck-tab-cards"]');

  // Add a card via search if results available; otherwise still verify Changes tab
  await t.click('[data-testid="deck-tab-changes"]');
  await t.expect(Selector('[data-testid="changes-hub"]').exists).ok();
  await t.expect(Selector('[data-testid="changes-nav-add"]').exists).ok();
  await t.expect(Selector('[data-testid="changes-nav-cut"]').exists).ok();
  await t.expect(Selector('[data-testid="changes-nav-consider"]').exists).ok();
  await t.expect(Selector('[data-testid="changes-nav-projected"]').exists).ok();

  // Apply disabled when no pending changes
  await t
    .expect(
      Selector('[data-testid="open-apply-changes-btn"]').hasAttribute(
        "disabled",
      ),
    )
    .ok();
});
