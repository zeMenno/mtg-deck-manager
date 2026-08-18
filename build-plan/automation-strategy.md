# Automation & Quality Strategy

This document defines the **continuous quality pipeline** for the MTG Deck Builder. Every phase agent must read it and implement the automation tasks listed for that phase. The goal is to let development proceed phase-by-phase without manual regression hunting — CI blocks broken builds before the next phase starts.

Master reference: [`plans/mtg-deck-builder-web-app-build-plan.md`](../plans/mtg-deck-builder-web-app-build-plan.md) §41–42.

---

## Toolchain Overview

| Tool                       | Purpose                             | Introduced       | Enforced in CI   |
| -------------------------- | ----------------------------------- | ---------------- | ---------------- |
| **TypeScript** (`strict`)  | Type safety                         | Phase 1          | Phase 1+         |
| **ESLint**                 | Lint errors, React/Next rules       | Phase 1          | Phase 1+         |
| **Prettier**               | Formatting                          | Phase 1          | Phase 1+ (check) |
| **Husky + lint-staged**    | Pre-commit gates                    | Phase 1          | Local dev        |
| **Knip**                   | Unused files, exports, dependencies | Phase 1 (report) | Phase 15+ (fail) |
| **Vitest**                 | Unit + integration tests            | Phase 3          | Phase 3+         |
| **fake-indexeddb**         | IndexedDB in Node tests             | Phase 3          | Phase 3+         |
| **MSW**                    | Mock Scryfall/pricing APIs          | Phase 4          | Phase 4+         |
| **@testing-library/react** | Component tests (selective)         | Phase 5          | Phase 5+         |
| **TestCafe**               | E2E browser tests                   | Phase 5 (smoke)  | Phase 15+ (full) |
| **GitHub Actions**         | CI pipeline                         | Phase 1          | Always           |

### Why TestCafe (not Playwright)

TestCafe runs tests in real browsers without WebDriver, handles iframes/shadow DOM well, and supports mobile viewport profiles. It fits a PWA that must behave on Safari-like environments. Configuration lives in `.testcaferc.js` with `tests/e2e/**/*.test.ts`.

Alternative: Playwright is acceptable if TestCafe blockers appear — document the switch in `docs/decisions.md`.

---

## npm Scripts (target state after Phase 15)

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --max-warnings 0",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit",
    "knip": "knip",
    "test": "vitest",
    "test:unit": "vitest run --project unit",
    "test:integration": "vitest run --project integration",
    "test:ci": "vitest run --coverage",
    "test:e2e": "testcafe chrome:headless tests/e2e/**/*.test.ts",
    "test:e2e:mobile": "testcafe \"chrome:headless:width=390;height=844\" tests/e2e/**/*.test.ts",
    "test:all": "npm run typecheck && npm run lint && npm run knip && npm run test:ci && npm run build && npm run test:e2e",
    "verify": "npm run typecheck && npm run lint && npm run test:unit"
  }
}
```

Phases 1–2 use a subset; scripts are added incrementally (see matrix below).

---

## CI Pipeline Evolution

### Phase 1 — `ci.yml` (quality gate v1)

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check
      - run: npm run typecheck
      - run: npm run knip || true # report only until Phase 15
      - run: npm run build
```

### Phase 3 — add unit tests

```yaml
- run: npm run test:unit
```

### Phase 5 — add E2E smoke (optional, non-blocking)

```yaml
e2e-smoke:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: "20", cache: npm }
    - run: npm ci
    - run: npm run build
    - run: npm run start &
    - run: npx wait-on http://localhost:3000
    - run: npm run test:e2e:smoke
```

### Phase 15 — full gate (quality gate v2)

All jobs required. Knip fails on unused exports. Full TestCafe suite. Coverage thresholds enforced.

```yaml
- run: npm run knip # no || true
- run: npm run test:ci
- run: npm run test:e2e
```

### Phase 16 — production

- CI must pass on `main` before production promote
- Optional: nightly workflow against Vercel preview URL

---

## Test Pyramid

```text
                    ┌─────────────┐
                    │  TestCafe   │  5–12 E2E journeys (Phase 5 smoke → Phase 15 full)
                    │    E2E      │
                ┌───┴─────────────┴───┐
                │  Vitest Integration │  Repos, services, import round-trips
            ┌───┴─────────────────────┴───┐
            │      Vitest Unit Tests        │  Pure logic: stats, validation, pricing
        ┌───┴───────────────────────────────┴───┐
        │  ESLint + Typecheck + Knip + Prettier   │  Every commit (Phase 1+)
        └─────────────────────────────────────────┘
```

**Rule:** Never hit real Scryfall in CI. Use MSW fixtures from Phase 4 onward.

---

## Phase-by-Phase Automation Matrix

| Phase  | Add to toolchain                                                          | Tests to write                                 | CI change                         |
| ------ | ------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------- |
| **0**  | Document strategy in `docs/decisions.md`                                  | Acceptance criteria as test cases in spec      | —                                 |
| **1**  | ESLint, Prettier, Husky, lint-staged, Knip, Vitest stub, typecheck script | Smoke: `lib/utils` if any                      | lint + format + typecheck + build |
| **2**  | —                                                                         | Manual PWA checklist started                   | unchanged                         |
| **3**  | Vitest + fake-indexeddb, test helpers                                     | Repo CRUD, migration stub, export serialize    | + `test:unit`                     |
| **4**  | MSW, Scryfall fixtures                                                    | Normalizer, rate limiter, DFC parser           | + scryfall unit tests             |
| **5**  | TestCafe, `data-testid` convention                                        | Deck CRUD integration; E2E smoke: create deck  | + e2e-smoke (optional)            |
| **6**  | —                                                                         | Mana curve, distributions, warnings unit tests | unit tests in CI                  |
| **7**  | —                                                                         | Projected deck math, apply-changes integration | unit + integration                |
| **8**  | —                                                                         | Price fallback, totals (never $0)              | unit tests                        |
| **9**  | —                                                                         | Image URL resolver unit tests                  | unit tests                        |
| **10** | Backup fixtures (valid + corrupt)                                         | Import/export, parser, validation              | integration tests                 |
| **11** | —                                                                         | Version diff, snapshot restore                 | integration tests                 |
| **12** | —                                                                         | Wishlist CRUD, promotion flows                 | integration tests                 |
| **13** | —                                                                         | Commander rules 100% coverage                  | unit tests (strict)               |
| **14** | eslint-plugin-jsx-a11y (optional)                                         | `data-testid` audit for E2E                    | lint may include a11y             |
| **15** | Full TestCafe suite, coverage thresholds                                  | All E2E journeys; migration; offline; SW       | knip fail + full e2e              |
| **16** | —                                                                         | Run full `test:all` before tag v1.0.0          | required on main                  |

---

## File Structure (testing)

```text
.eslintrc.json / eslint.config.mjs
.prettierrc
.testcaferc.js
knip.json
vitest.config.ts
vitest.workspace.ts          # unit + integration projects
tests/
  setup/
    vitest.setup.ts
    fake-indexeddb.ts
    testcafe-hooks.ts
  helpers/
    db-test-utils.ts
    seed-test-deck.ts
  fixtures/
    cards.json
    backups/
  mocks/
    scryfall-handlers.ts
    pricing-handlers.ts
  unit/
    **/*.test.ts
  integration/
    **/*.test.ts
  e2e/
    **/*.test.ts             # TestCafe
build-plan/checklists/
  iphone-safari-manual.md
.github/workflows/
  ci.yml
  e2e-nightly.yml            # optional Phase 16
```

---

## data-testid Convention (Phase 5+)

Stable selectors for TestCafe — never rely on CSS classes alone.

| Element              | data-testid            |
| -------------------- | ---------------------- |
| Create deck button   | `deck-create-btn`      |
| Deck list item       | `deck-item-{deckId}`   |
| Deck name input      | `deck-name-input`      |
| Card search input    | `card-search-input`    |
| Card result row      | `card-result-{cardId}` |
| Add to deck button   | `add-to-deck-btn`      |
| Status toggle ADD    | `status-add-btn`       |
| Status toggle CUT    | `status-cut-btn`       |
| Apply changes button | `apply-changes-btn`    |
| Export all button    | `export-all-btn`       |
| Import backup input  | `import-backup-input`  |
| Offline indicator    | `offline-indicator`    |

Document new testids in the phase that introduces the UI.

---

## Coverage Targets (enforced Phase 15)

| Path                            | Minimum |
| ------------------------------- | ------- |
| `lib/format/**`                 | 100%    |
| `lib/import-export/**`          | 90%     |
| `lib/db/migrations/**`          | 100%    |
| `lib/deck/**`, `lib/pricing/**` | 80%     |
| `lib/**` overall                | 70%     |

---

## Pre-Commit Hook (Phase 1)

`.husky/pre-commit`:

```bash
npx lint-staged
```

`lint-staged.config.js`:

```js
export default {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md,css}": ["prettier --write"],
};
```

---

## Knip Configuration (Phase 1)

`knip.json`:

```json
{
  "$schema": "https://unpkg.com/knip@5/schema.json",
  "entry": ["app/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}"],
  "project": ["**/*.{ts,tsx}"],
  "ignore": ["**/*.test.ts", "tests/**"],
  "ignoreDependencies": ["@types/*"]
}
```

Phase 1: `npm run knip` reports warnings. Phase 15: CI fails on knip errors.

---

## TestCafe Configuration (Phase 5+)

`.testcaferc.js`:

```js
module.exports = {
  baseUrl: "http://localhost:3000",
  screenshots: {
    path: "tests/e2e/screenshots",
    takeOnFails: true,
  },
  quarantineMode: true,
  selectorTimeout: 10000,
  assertionTimeout: 10000,
};
```

Example smoke test (`tests/e2e/deck-create.test.ts`):

```ts
import { Selector } from "testcafe";

fixture("Deck CRUD smoke").page("http://localhost:3000/decks");

test("Create deck persists after reload", async (t) => {
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

---

## Critical E2E Journeys (Phase 15 complete set)

1. **create-deck** — create Commander deck, add cards, reload, data persists
2. **upgrade-workflow** — mark ADD/CUT, view changes, apply
3. **export-import** — export backup, clear data, import, restore
4. **wishlist-flow** — add to wishlist, promote to ADD
5. **offline-edit** — go offline, edit deck, reload, data intact
6. **card-search** — search (mocked), open detail, add to deck

Manual only (iPhone): Home Screen install → close app → reopen → deck intact.

See [`checklists/iphone-safari-manual.md`](./checklists/iphone-safari-manual.md).

---

## Agent Instructions

When implementing any phase:

1. Read this document.
2. Complete the **Automation & Quality Gates** section in your phase doc.
3. Add tests **with the feature**, not deferred to Phase 15.
4. Ensure CI stays green before marking phase complete.
5. Add `data-testid` to new interactive UI (Phase 5+).

Phase 15 expands coverage; it does **not** replace per-phase test writing.
