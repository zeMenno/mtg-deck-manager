import { Selector } from "testcafe";

fixture("Export / import recovery").page("http://localhost:3000/settings/data");

test("Data page exposes export, import, and clear controls", async (t) => {
  await t.expect(Selector('[data-testid="ios-storage-warning"]').exists).ok();
  await t.expect(Selector('[data-testid="export-all-btn"]').exists).ok();
  await t.expect(Selector('[data-testid="import-backup-input"]').exists).ok();
  await t.expect(Selector('[data-testid="clear-all-btn"]').exists).ok();
  await t.expect(Selector('[data-testid="last-backup-status"]').exists).ok();
});

test("Clear dialog offers export-first path", async (t) => {
  await t.click('[data-testid="clear-all-btn"]');
  await t.expect(Selector('[data-testid="clear-data-dialog"]').exists).ok();
  await t
    .expect(Selector('[data-testid="clear-export-continue-btn"]').exists)
    .ok();
  await t
    .expect(Selector('[data-testid="clear-without-export-btn"]').exists)
    .ok();
  await t.click('[data-testid="clear-cancel-btn"]');
});
