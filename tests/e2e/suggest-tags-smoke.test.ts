import { Selector } from "testcafe";

fixture("Tag suggestions smoke").page("http://localhost:3000/decks/new");

test("deck dashboard exposes the local suggestion preview", async (t) => {
  await t
    .typeText(
      '[data-testid="deck-name-input"]',
      `Suggestion Smoke ${Date.now()}`,
    )
    .click('[data-testid="deck-save-skip-commander-btn"]')
    .expect(Selector('[data-testid="deck-suggest-tags-btn"]').exists)
    .ok()
    .click('[data-testid="deck-suggest-tags-btn"]')
    .expect(Selector('[data-testid="suggest-tags-sheet"]').exists)
    .ok()
    .click('[data-testid="suggest-tags-preview-btn"]')
    .expect(Selector('[data-testid="suggest-preview"]').exists)
    .ok()
    .expect(
      Selector('[data-testid="suggest-tags-apply-btn"]').hasAttribute(
        "disabled",
      ),
    )
    .ok();
});
