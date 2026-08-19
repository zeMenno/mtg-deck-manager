import { Selector } from "testcafe";

/**
 * Undo / offline selector smoke — ensures Phase 14 data-testid hooks remain
 * present for hardening (full undo restore is covered by unit-dom tests).
 */
fixture("Undo and offline selectors").page("http://localhost:3000/decks");

test("Undo snackbar mounts after a reversible toast path is unused until action", async (t) => {
  // Provider is mounted; snackbar absent until an undoable action fires
  await t.expect(Selector('[data-testid="undo-snackbar"]').exists).notOk();
  await t.expect(Selector('[data-testid="deck-create-btn"]').exists).ok();
});
