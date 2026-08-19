import { Selector } from "testcafe";

fixture("Search filters & legality tab").page("http://localhost:3000/cards");

test("filters sheet opens, applies chips, and clears", async (t) => {
  await t
    .expect(Selector('[data-testid="card-search-input"]').exists)
    .ok({ timeout: 15000 });

  await t.click(Selector('[data-testid="card-search-filters-btn"]'));
  await t
    .expect(Selector('[data-testid="card-search-filters-sheet"]').exists)
    .ok();

  await t.click(Selector('[data-testid="filter-color-R"]'));
  await t.click(Selector('[data-testid="filter-rarity-rare"]'));
  await t.click(Selector('[data-testid="filter-apply"]'));

  await t
    .expect(Selector('[data-testid="card-search-filter-chips"]').exists)
    .ok();
  await t
    .expect(Selector('[data-testid="card-search-filters-count"]').innerText)
    .eql("2");

  await t.click(Selector('[data-testid="filter-chips-clear-all"]'));
  await t
    .expect(Selector('[data-testid="card-search-filter-chips"]').exists)
    .notOk();
});
