import { Selector } from "testcafe";

/**
 * Wishlist flow smoke — open wishlist via bottom nav, verify empty state /
 * page shell. Full add→promote path is covered by integration tests; this
 * E2E checks navigation and primary affordances.
 */
fixture("Wishlist flow").page("http://localhost:3000/wishlist");

test("Wishlist page renders and nav is active", async (t) => {
  await t.expect(Selector('[data-testid="wishlist-page"]').exists).ok();
  await t.expect(Selector("h1").withText("Wishlist").exists).ok();
  await t.expect(Selector('[data-testid="wishlist-filters"]').exists).ok();
  await t
    .expect(Selector('[data-testid="wishlist-browse-cards-btn"]').exists)
    .ok();

  // Bottom nav Wishlist link is present
  await t.click(Selector("nav a").withText("Wishlist"));
  await t.expect(Selector('[data-testid="wishlist-page"]').exists).ok();
});

test("Browse cards CTA navigates to search", async (t) => {
  await t.click('[data-testid="wishlist-browse-cards-btn"]');
  await t.expect(Selector("h1").withText("Search Cards").exists).ok();
});
