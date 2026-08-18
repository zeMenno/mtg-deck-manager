# Phase 15 — Testing & Hardening

## Agent Handoff Prompt

```
You are implementing Phase 15 (Testing & Hardening) of the MTG Deck Builder PWA.

Workspace: mtg-deck-manager
Read first:
- build-plan/phase-15-testing-hardening.md (this document — follow every section)
- build-plan/README.md (context and dependencies)
- plans/mtg-deck-builder-web-app-build-plan.md (master reference, sections 41, 42)

Prerequisites: Phases 0–14 complete. All features implemented and UX polished.

Goal: Prevent data-loss bugs and regressions through comprehensive automated testing and device hardening. Implement Vitest unit tests, integration tests, TestCafe E2E tests, Knip dead-code checks, and manual test checklists for iPhone Safari, offline scenarios, DB migrations, import corruption, and service worker updates.

Deliverables:
1. Vitest configured with unit tests for core business logic
2. Integration tests for repository + service workflows
3. TestCafe E2E for critical user journeys (full suite — smoke started Phase 5)
4. Knip enforced in CI (fail on unused exports/deps)
5. iPhone Safari manual test checklist (documented + executed)
6. Offline test suite (automated where possible)
7. DB migration test suite (schema version upgrades)
8. Import corruption / malformed backup tests
9. Service worker update tests
10. CI pipeline: lint + format + typecheck + knip + test:ci + build + test:e2e

Read build-plan/automation-strategy.md — this phase completes the automation matrix.

Highest priority test:
Create deck → Close app → Reopen from Home Screen → Deck remains intact (manual iPhone)

When done, all CI checks green and manual iPhone checklist signed off.
```

## Overview

Phase 15 is the **quality gate** before production launch. The MTG Deck Builder is local-first — a bug that corrupts or loses IndexedDB data destroys user trust permanently. This phase builds automated safety nets and validates behavior on real iPhone hardware where simulators lie (storage partitioning, service workers, safe areas).

Testing spans four layers:

1. **Unit tests** — pure functions: calculations, validation, parsing
2. **Integration tests** — Dexie repositories, services, import/export round-trips
3. **E2E tests** — TestCafe browser flows against running app
4. **Manual device tests** — iPhone Safari standalone PWA behaviors

The master plan's highest-priority test is **persistence across app close and Home Screen relaunch** — this must pass on a physical iPhone before Phase 16.

## Goal

1. Achieve meaningful automated test coverage of business-critical paths.
2. Prevent data-loss regressions through persistence and migration tests.
3. Validate offline behavior does not corrupt data.
4. Verify import handles malformed input safely.
5. Confirm service worker updates don't strand users on broken caches.
6. Document and execute iPhone Safari manual checklist.
7. Integrate all tests into CI (GitHub Actions → Vercel preview).

## Prerequisites

- **Phases 0–14** — complete feature set to test.
- **Phase 3** — Dexie with migrations (test utilities needed).
- **Phase 10** — import/export to test corruption handling.
- **Phase 2** — service worker for update tests.
- Vitest and TestCafe (TestCafe smoke from Phase 5; full suite here).

## Dependencies on Previous Phases

| Phase | Test focus                                      |
| ----- | ----------------------------------------------- |
| 3     | DB CRUD, migrations                             |
| 4     | Scryfall client mocking                         |
| 5     | Deck CRUD                                       |
| 6     | Stats calculations                              |
| 7     | ADD/CUT/CONSIDER, projected deck, apply changes |
| 8     | Price calculations, fallback                    |
| 10    | Import/export, backup validation                |
| 11    | Version snapshots, compare                      |
| 12    | Wishlist CRUD, promotion                        |
| 13    | Commander validation rules                      |
| 14    | Undo, offline indicator (E2E selectors)         |

## Duration Estimate

**7–10 days** for a single developer.

| Sub-area                            | Estimate |
| ----------------------------------- | -------- |
| Test infrastructure setup           | 1 day    |
| Unit tests (all modules)            | 2–3 days |
| Integration tests                   | 2 days   |
| TestCafe E2E                        | 2 days   |
| Migration + import corruption tests | 1 day    |
| SW update tests                     | 0.5 day  |
| iPhone manual testing + fixes       | 1–2 days |
| CI integration                      | 0.5 day  |

## Architecture & Key Decisions

### Test stack

**Decision:**

| Layer               | Tool                                           |
| ------------------- | ---------------------------------------------- |
| Unit + Integration  | Vitest                                         |
| DOM component tests | Vitest + @testing-library/react (selective)    |
| E2E                 | TestCafe                                       |
| Dead code           | Knip (fail CI)                                 |
| Mock IndexedDB      | `fake-indexeddb` (Node) or Dexie test helpers  |
| API mocking         | MSW (Mock Service Worker) for Scryfall/pricing |
| CI                  | GitHub Actions                                 |

### Test database isolation

**Decision:** Each test gets fresh IndexedDB:

```ts
beforeEach(async () => {
  await db.delete();
  await db.open();
});
```

Use `fake-indexeddb/auto` in Vitest setup for Node environment.

### What to unit test vs E2E

**Decision:**

| Unit                   | E2E                              |
| ---------------------- | -------------------------------- |
| Mana curve calculation | Create deck flow                 |
| Projected deck math    | Search → add card                |
| Commander validation   | Mark ADD → view cost             |
| Price totals           | Export → reload → data exists    |
| Import parser          | Home Screen persistence (manual) |
| Migration logic        |                                  |
| Duplicate detection    |                                  |

E2E tests are **slow and flaky** — keep to 5–10 critical paths. Everything else unit/integration.

### Scryfall/pricing in tests

**Decision:** Never hit real Scryfall in CI. Use MSW fixtures or injected mock clients.

### TestCafe configuration

**Decision:**

- Base URL: `http://localhost:3000` (production build via `npm run start` in CI)
- Browsers: `chrome:headless` (CI); `chrome:headless:width=390;height=844` for mobile profile
- Config: `.testcaferc.js` — quarantineMode, screenshots on fail
- Selectors: `data-testid` only (stable; see automation-strategy.md)
- Fresh IDB per test: clear site data or use incognito-like isolation between fixtures

### iPhone manual tests

**Decision:** Cannot fully automate Home Screen install persistence in CI. Maintain `build-plan/checklists/iphone-safari-manual.md` or section in this doc. Require sign-off before Phase 16.

### Coverage targets

**Decision:** Pragmatic, not arbitrary 100%:

| Area                      | Target               |
| ------------------------- | -------------------- |
| `lib/format/*` validators | 100%                 |
| `lib/import-export/*`     | 90%+                 |
| `lib/db/migrations/*`     | 100%                 |
| `lib/services/*`          | 80%+                 |
| UI components             | Critical paths only  |
| Overall                   | 70%+ lines in `lib/` |

## Data Model Impact

**None** for production schema.

### Test utilities (create)

```text
tests/setup/vitest.setup.ts
tests/setup/fake-indexeddb.ts
tests/fixtures/cards.json
tests/fixtures/decks.json
tests/fixtures/backups/valid-backup-v1.json
tests/fixtures/backups/valid-backup-v3.json
tests/fixtures/backups/corrupt-*.json
tests/helpers/db-test-utils.ts
tests/helpers/seed-test-deck.ts
tests/mocks/scryfall-handlers.ts
tests/mocks/pricing-handlers.ts
```

## Routes / Screens

No new user-facing routes. E2E tests navigate existing routes.

### Critical E2E paths (routes touched)

```text
/ → /decks → /decks/[id] → /decks/[id]/cards
/cards (search)
/decks/[id]/changes
/wishlist
/settings/data (export)
```

## File Structure (files to create/modify)

### Create

```text
vitest.config.ts
vitest.workspace.ts
.testcaferc.js
tests/setup/testcafe-hooks.ts
tests/setup/vitest.setup.ts
tests/setup/fake-indexeddb.ts
tests/helpers/db-test-utils.ts
tests/helpers/seed-test-deck.ts
tests/fixtures/
tests/mocks/scryfall-handlers.ts
tests/mocks/pricing-handlers.ts
tests/unit/format/commander-rules.test.ts
tests/unit/format/duplicate-detection.test.ts
tests/unit/format/color-identity.test.ts
tests/unit/format/deck-size.test.ts
tests/unit/deck/projected-deck.test.ts
tests/unit/deck/status-filter.test.ts
tests/unit/pricing/price-totals.test.ts
tests/unit/pricing/price-fallback.test.ts
tests/unit/import-export/backup-export.test.ts
tests/unit/import-export/backup-import.test.ts
tests/unit/import-export/text-decklist-parser.test.ts
tests/unit/import-export/corrupt-import.test.ts
tests/integration/deck-crud.test.ts
tests/integration/deck-status-workflow.test.ts
tests/integration/apply-changes.test.ts
tests/integration/version-snapshot.test.ts
tests/integration/wishlist-promotion.test.ts
tests/integration/offline-deck-edit.test.ts
tests/integration/db-migrations.test.ts
tests/e2e/create-deck.test.ts
tests/e2e/upgrade-workflow.test.ts
tests/e2e/export-import.test.ts
tests/e2e/wishlist-flow.test.ts
tests/e2e/offline-shell.test.ts
tests/e2e/card-search.test.ts
build-plan/checklists/iphone-safari-manual.md
.github/workflows/test.yml
```

### Modify

```text
package.json                    — test scripts
.github/workflows/ci.yml        — add test job (or merge into test.yml)
lib/db/migrations/              — ensure testable exports
```

## Detailed Task List

### 15.1 — Test Infrastructure

- [ ] Install Vitest, @testing-library/react, fake-indexeddb, MSW, TestCafe (if not from Phase 5)
- [ ] Configure `vitest.config.ts` + `vitest.workspace.ts` (unit + integration projects)
- [ ] Configure `.testcaferc.js`:
  - [ ] baseUrl localhost:3000
  - [ ] Mobile chrome profile 390×844
  - [ ] quarantineMode + screenshots on fail
- [ ] **Knip:** remove `|| true` from CI; fix all unused export/dep warnings
- [ ] Create `tests/helpers/db-test-utils.ts`:
  - [ ] `resetDatabase()`
  - [ ] `seedCards()`, `seedDeck()`, `seedWishlist()`
- [ ] Create fixture JSON files from realistic Scryfall-shaped data
- [ ] Add npm scripts:
  - [ ] `"test": "vitest"`
  - [ ] `"test:ci": "vitest run --coverage"`
  - [ ] `"test:e2e": "testcafe chrome:headless tests/e2e/**/*.test.ts"`
  - [ ] `"test:e2e:mobile": "testcafe \"chrome:headless:width=390;height=844\" tests/e2e/**/*.test.ts"`
  - [ ] `"test:all": "npm run typecheck && npm run lint && npm run knip && npm run test:ci && npm run build && npm run test:e2e"`

### 15.2 — Unit Tests: Deck Calculations

- [ ] Mana curve histogram from deck cards
- [ ] Type distribution counts
- [ ] Color distribution
- [ ] Role/synergy distribution
- [ ] Land count
- [ ] Average CMC (excluding lands)
- [ ] Status filter: CURRENT, ADD, CUT, CONSIDER views
- [ ] Projected deck: CURRENT + ADD - CUT quantity math
- [ ] Projected deck: commander zone handling
- [ ] Upgrade cost: sum ADD cards × price
- [ ] Deck value: sum CURRENT cards × price
- [ ] Price total skips null prices (never $0 on missing)

### 15.3 — Unit Tests: Format Validation (Phase 13)

- [ ] Commander count: 0, 1, 2 → expected warnings
- [ ] Deck size: 98, 100, 101
- [ ] Duplicates: basic land OK, non-basic fail
- [ ] Duplicates: same oracleId different printing
- [ ] Color identity: off-color fail, colorless pass
- [ ] Scryfall legality: banned, not_legal, missing
- [ ] Recommendations: land/ramp/draw thresholds
- [ ] Configurable thresholds change outcomes
- [ ] Warning category assignment (LEGALITY vs RECOMMENDATION)
- [ ] Projected deck validation uses projected composition

### 15.4 — Unit Tests: Import / Export

- [ ] Export produces valid JSON with schemaVersion
- [ ] Export includes all tables (decks, cards, wishlist, versions, settings)
- [ ] Import valid backup restores all data
- [ ] Import old schema version triggers migration
- [ ] Import missing optional sections defaults gracefully
- [ ] Text decklist parser: various formats (1x, 2x, quantity prefix/suffix)
- [ ] CSV export format validation
- [ ] Corrupt JSON rejected with clear error
- [ ] Truncated JSON rejected
- [ ] Wrong schemaVersion handled
- [ ] Invalid card references skipped or reported
- [ ] Oversized file rejected (size limit if implemented)
- [ ] Duplicate deck ID on import: merge or rename strategy tested

### 15.5 — Unit Tests: Pricing

- [ ] Price fallback: unavailable shows message not $0
- [ ] Stale price timestamp formatting
- [ ] Currency display
- [ ] Batch price total with mixed available/unavailable

### 15.6 — Integration Tests: Deck Workflows

- [ ] Create deck → add cards → reload DB → cards persist
- [ ] Change card status ADD → appears in ADD filter
- [ ] Change card status CUT → appears in CUT filter
- [ ] Apply changes: ADD→CURRENT, CUT removed
- [ ] Apply changes blocked when projected deck illegal (Phase 13)
- [ ] Duplicate deck → independent copy
- [ ] Delete deck → cascade deck cards removed
- [ ] Add roles/synergies → persist

### 15.7 — Integration Tests: Versions

- [ ] Save version → snapshot matches current deck
- [ ] Restore version → deck cards replaced
- [ ] Compare versions → correct added/removed/diff
- [ ] Version notes persist

### 15.8 — Integration Tests: Wishlist

- [ ] Add to wishlist → item in DB
- [ ] Promote to CONSIDER → deck card created
- [ ] Promote to ADD → deck card status add
- [ ] Wishlist included in export/import

### 15.9 — Integration Tests: DB Migrations

- [ ] Test migration from v1 → current schema
- [ ] Test migration from v2 → current (if wishlist added v3)
- [ ] Each migration script runs idempotently
- [ ] Migration failure rolls back or reports clearly
- [ ] `migrate()` on fresh DB creates latest schema
- [ ] Backup from old version imports after migration

### 15.10 — Integration Tests: Offline

- [ ] Deck edit with mocked offline (no fetch) succeeds
- [ ] Cached card search returns local results only
- [ ] Price shows cached value when refresh fails
- [ ] Scryfall search failure does not block local deck view

### 15.11 — TestCafe E2E Tests

- [ ] **create-deck.test.ts**:
  - [ ] Navigate to decks → create Commander deck
  - [ ] Add commander via search (MSW-backed or seeded cache)
  - [ ] Add 3 cards
  - [ ] Reload page
  - [ ] Assert deck and cards still visible
- [ ] **upgrade-workflow.test.ts**:
  - [ ] Mark card ADD, another CUT
  - [ ] View changes screen → cost displayed
  - [ ] Apply changes
  - [ ] Assert statuses updated
- [ ] **export-import.test.ts**:
  - [ ] Create deck with cards
  - [ ] Export all data (download)
  - [ ] Clear all data (with confirm)
  - [ ] Import backup
  - [ ] Assert deck restored
- [ ] **wishlist-flow.test.ts**:
  - [ ] Add card to wishlist from search
  - [ ] Move to ADD on deck
  - [ ] Assert on changes screen
- [ ] **offline-shell.test.ts**:
  - [ ] Load app → simulate offline (TestCafe `Role` + network stub or pre-cache)
  - [ ] Navigate decks → edit deck
  - [ ] Assert offline indicator visible
  - [ ] Assert edits persist after reload
- [ ] **card-search.test.ts**:
  - [ ] Search with MSW fixture
  - [ ] Open card detail sheet
  - [ ] Add to deck

### 15.12 — Service Worker Update Tests

- [ ] Unit: cache version bump logic
- [ ] Unit: old cache cleanup
- [ ] E2E: "Update available" UI flow
- [ ] Manual: deploy preview → open installed PWA → verify update prompt

### 15.13 — iPhone Safari Manual Checklist

Create [`checklists/iphone-safari-manual.md`](./checklists/iphone-safari-manual.md) (if not exists):

- [ ] Install to Home Screen from Safari
- [ ] Launch from Home Screen → standalone (no Safari chrome)
- [ ] Create deck → force close app → reopen → data intact (**#1 priority**)
- [ ] Airplane mode → edit deck → changes persist
- [ ] Airplane mode → offline indicator visible
- [ ] Card search offline (cached only) behavior correct
- [ ] Export backup via Share sheet
- [ ] Import backup from Files app
- [ ] Service worker update after new deploy
- [ ] Safe-area: bottom nav not clipped
- [ ] Safe-area: bottom sheet actions reachable
- [ ] Keyboard: search input doesn't break layout
- [ ] External TCGplayer link opens Safari/新 tab
- [ ] Storage: Safari vs installed app storage separation understood (onboarding message)
- [ ] Long session: no memory crash on 100-card image mode scroll
- [ ] Landscape orientation acceptable (or locked portrait)

### 15.14 — CI Pipeline

- [ ] GitHub Actions workflow on PR:
  - [ ] `npm ci`
  - [ ] `npm run lint`
  - [ ] `npm run format:check`
  - [ ] `npm run typecheck`
  - [ ] `npm run knip` (fail on errors — no `|| true`)
  - [ ] `npm run test:ci` (Vitest with coverage thresholds)
  - [ ] `npm run build`
  - [ ] `npm run start &` + `wait-on` + `npm run test:e2e`
- [ ] Upload TestCafe screenshots on failure
- [ ] Coverage report artifact (optional)
- [ ] Block merge on any job failure

### 15.15 — Hardening Fixes

- [ ] Fix bugs discovered during testing (allocate 1–2 days buffer)
- [ ] Add `data-testid` to critical elements if missing (Phase 14 note)
- [ ] Storage quota exceeded handling tested
- [ ] DB migration failure user-facing error tested
- [ ] Rate limit Scryfall client (verify no burst in search E2E)

### 15.16 — Vercel Preview Testing

- [ ] Deploy preview URL accessible
- [ ] PWA manifest loads on preview
- [ ] Service worker registers on preview (HTTPS)
- [ ] Run smoke E2E against preview URL (optional nightly)

## Implementation Notes

### fake-indexeddb setup

```ts
// tests/setup/vitest.setup.ts
import "fake-indexeddb/auto";
```

### Seeding a test deck

```ts
export async function seedCommanderDeck(overrides?: Partial<Deck>) {
  const deck = await deckRepo.create({
    name: "Test Soldiers",
    format: "commander",
    ...overrides,
  });
  const commander = await seedCard({ name: "Adeline, Resplendent Cathar" });
  await deckCardRepo.add({
    deckId: deck.id,
    cardId: commander.id,
    zone: "commander",
    status: "current",
    quantity: 1,
  });
  return { deck, commander };
}
```

### TestCafe IndexedDB persistence

```ts
import { Selector } from "testcafe";

fixture("Deck persistence").page("http://localhost:3000/decks");

test("deck persists after reload", async (t) => {
  await t
    .click('[data-testid="deck-create-btn"]')
    .typeText('[data-testid="deck-name-input"]', "Test Soldiers")
    .click('[data-testid="deck-save-btn"]')
    .expect(
      Selector('[data-testid="deck-item"]').withText("Test Soldiers").exists,
    )
    .ok();
  await t.navigateTo("http://localhost:3000/decks");
  await t
    .expect(
      Selector('[data-testid="deck-item"]').withText("Test Soldiers").exists,
    )
    .ok();
});
```

TestCafe reload preserves IndexedDB for same origin — sufficient for E2E persistence tests. **Home Screen relaunch** requires manual iPhone test.

### Migration test pattern

```ts
it("migrates v2 to v3 adding wishlist tables", async () => {
  await openDatabaseAtVersion(2);
  await seedV2Data();
  await runMigrations();
  expect(await db.wishlistItems.count()).toBe(0); // empty but table exists
  expect(await db.wishlists.get("default")).toBeDefined();
});
```

### Corrupt import fixtures

Create fixtures:

- `truncated.json` — file cut mid-object
- `invalid-json.json` — syntax error
- `wrong-types.json` — deckId is number not string
- `missing-schema-version.json`
- `sql-injection.json` — ensure no code execution (sanity)

### MSW Scryfall mock

```ts
http.get("https://api.scryfall.com/cards/search", () => {
  return HttpResponse.json({ data: [mockCard], has_more: false });
});
```

## Automation & Quality Gates

Reference: [`automation-strategy.md`](./automation-strategy.md) — **Phase 15 completes the full matrix.**

This phase is the automation capstone. It does **not** replace tests that should have been written in Phases 3–14 — it consolidates, enforces thresholds, and fills gaps.

| Gate                          | Phase 15 action                                                                         |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| ESLint + Prettier + Typecheck | Already in CI; keep `--max-warnings 0`                                                  |
| Knip                          | Remove `                                                                                |     | true`; CI fails on unused exports/deps |
| Vitest unit                   | Fill gaps; enforce 70%+ `lib/` coverage                                                 |
| Vitest integration            | All workflow tests from Phases 3–12 present                                             |
| TestCafe E2E                  | Full 6-journey suite; mobile + desktop profiles                                         |
| Manual iPhone                 | [`checklists/iphone-safari-manual.md`](./checklists/iphone-safari-manual.md) signed off |
| `npm run test:all`            | Single command runs entire gate before Phase 16                                         |

## Testing Checklist

This phase IS the testing checklist. Summary of gates:

### Automated gates (CI must pass)

- [ ] All Vitest unit tests pass
- [ ] All Vitest integration tests pass
- [ ] All TestCafe E2E tests pass
- [ ] Knip passes with zero errors
- [ ] Build succeeds
- [ ] Lint + typecheck pass
- [ ] Coverage ≥70% in `lib/`

### Manual gates (before Phase 16)

- [ ] iPhone Safari manual checklist 100% passed
- [ ] Home Screen persistence test passed on physical device
- [ ] Service worker update tested on physical device
- [ ] No P0/P1 bugs open

### Regression suite (run before release)

- [ ] Full E2E suite
- [ ] Migration tests from all historical schema versions
- [ ] Import/export round-trip with production-sized backup (10 decks, 1000 cards)

## Exit Criteria

- [ ] Vitest configured with unit + integration tests passing
- [ ] TestCafe E2E covers 6+ critical user journeys
- [ ] DB migration tests cover all schema versions
- [ ] Import corruption tests verify safe failure modes
- [ ] Service worker update flow tested (automated + manual)
- [ ] Offline tests confirm no data loss
- [ ] CI runs all tests on every PR
- [ ] iPhone Safari manual checklist completed and signed off
- [ ] **Highest priority test passes:** create deck → close app → reopen Home Screen → deck intact
- [ ] Coverage targets met for `lib/format`, `lib/import-export`, `lib/db`
- [ ] All P0 bugs from testing fixed

## Risks & Mitigations

| Risk                                    | Impact                | Mitigation                                      |
| --------------------------------------- | --------------------- | ----------------------------------------------- |
| fake-indexeddb differs from Safari IDB  | False confidence      | Manual iPhone tests mandatory                   |
| Flaky E2E tests                         | CI noise              | Retry, stable selectors, avoid timing hacks     |
| TestCafe can't test Home Screen         | Gap in automation     | Manual checklist required                       |
| Test suite too slow                     | Devs skip tests       | Parallelize; unit-heavy, E2E minimal            |
| Migration test doesn't match production | Data loss on upgrade  | Export real backups from dev builds as fixtures |
| SW tests environment-specific           | CI passes, prod fails | Manual deploy verification                      |

## Out of Scope

- Visual regression testing (Percy/Chromatic) — optional future
- Load/stress testing
- Penetration testing
- Accessibility automated audit (axe-core optional nice-to-have)
- Multi-browser E2E (Firefox, Safari desktop) beyond WebKit project
- Test coverage for every UI component
- Performance benchmarking CI gates
- Beta user testing program

## Handoff to Next Phase

**Next: Phase 16 — Production Launch**

Phase 15 ensures quality; Phase 16 executes the production deployment checklist, Vercel configuration, domain setup, and launch decisions (error tracking, analytics).

Before handoff:

1. CI green on `main` branch.
2. iPhone manual checklist attached to repo or project board as signed-off.
3. Known issues documented in `CHANGELOG.md` or release notes.
4. All `data-testid` attributes stable for post-launch debugging.
5. Error tracking hook points identified (even if tool decision deferred to Phase 16).
