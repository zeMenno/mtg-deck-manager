import { ClientFunction, Selector } from "testcafe";

/**
 * Offline shell — verifies the global offline indicator and that local
 * navigation still works when the browser reports offline.
 * Full airplane-mode PWA persistence remains a manual iPhone checklist item.
 */
fixture("Offline shell")
  .page("http://localhost:3000/decks")
  .afterEach(async () => {
    await setOffline(false);
  });

const setOffline = ClientFunction((offline: boolean) => {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    get: () => !offline,
  });
  window.dispatchEvent(new Event(offline ? "offline" : "online"));
});

test("Offline indicator appears and clears", async (t) => {
  await t.expect(Selector('[data-testid="offline-indicator"]').exists).notOk();

  await setOffline(true);
  await t.expect(Selector('[data-testid="offline-indicator"]').exists).ok();
  await t
    .expect(Selector('[data-testid="offline-indicator"]').textContent)
    .contains("offline");

  await setOffline(false);
  await t.expect(Selector('[data-testid="offline-indicator"]').exists).notOk();
});

test("Decks page remains usable while offline", async (t) => {
  await setOffline(true);
  await t.expect(Selector('[data-testid="offline-indicator"]').exists).ok();
  await t.expect(Selector('[data-testid="deck-create-btn"]').exists).ok();
  await setOffline(false);
});
