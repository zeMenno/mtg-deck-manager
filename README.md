# MTG Deck Builder

Mobile-first, local-first Progressive Web App for maintaining Magic: The Gathering Commander decks. Every card in a deck carries a status — CURRENT, ADD, CUT, or CONSIDER — plus role and synergy tags, and the app derives the current deck, the projected deck, the shopping list, and the upgrade cost from that single model.

- **Product spec:** [`docs/product-spec.md`](./docs/product-spec.md)
- **Data model:** [`docs/data-model.md`](./docs/data-model.md)
- **Decision log (ADRs):** [`docs/decisions.md`](./docs/decisions.md)
- **Build plan:** [`build-plan/README.md`](./build-plan/README.md)
- **Automation strategy:** [`build-plan/automation-strategy.md`](./build-plan/automation-strategy.md)

> **Current status: Phase 1 (Repository & Foundation) complete.** This is the application skeleton — theme, app shell, tooling, and CI. There is no local database, card search, or deck editing yet; those arrive in Phases 3, 4, and 5.

---

## Stack

| Concern     | Choice                          | Version |
| ----------- | ------------------------------- | ------- |
| Framework   | Next.js (App Router)            | 15.5.x  |
| UI runtime  | React                           | 19.1.x  |
| Language    | TypeScript (`strict`)           | 5.9.x   |
| Styling     | Tailwind CSS (CSS-first config) | 4.3.x   |
| Components  | shadcn/ui (`new-york` style)    | CLI 4.x |
| Icons       | lucide-react                    | 1.x     |
| Theme       | tweakcn Neo Brutalism           | —       |
| Unit tests  | Vitest                          | 4.x     |
| E2E (later) | TestCafe (Phase 5+)             | —       |
| Hosting     | Vercel                          | —       |

Versions are pinned deliberately: Next 15 + React 19 + Tailwind 4 is the combination the build plan targets. Do not upgrade to Next 16 without an ADR.

---

## Local development

**Prerequisites:** Node.js 20 or newer, npm, Git.

```bash
npm install
cp .env.example .env.local   # PowerShell: Copy-Item .env.example .env.local
npm run dev
```

The app runs at <http://localhost:3000>. Design against a 390 × 844 viewport (iPhone 14/15); 375 × 667 (iPhone SE) is the minimum supported size.

### npm scripts

| Script                 | What it does                                                         |
| ---------------------- | -------------------------------------------------------------------- |
| `npm run dev`          | Next dev server on port 3000                                         |
| `npm run build`        | Production build                                                     |
| `npm start`            | Serve the production build                                           |
| `npm run lint`         | ESLint over the repo, `--max-warnings 0`                             |
| `npm run lint:fix`     | ESLint with autofix                                                  |
| `npm run format`       | Prettier write                                                       |
| `npm run format:check` | Prettier check (CI gate)                                             |
| `npm run typecheck`    | `tsc --noEmit`                                                       |
| `npm run knip`         | Unused files, exports, and dependencies (report-only until Phase 15) |
| `npm test`             | Vitest in watch mode                                                 |
| `npm run test:unit`    | Vitest unit project, single run                                      |
| `npm run test:ci`      | Vitest with coverage                                                 |
| `npm run verify`       | `typecheck` → `lint` → `test:unit`. Run this before every commit.    |

### Quality gates

`npm run verify` is the local gate. CI ([`.github/workflows/ci.yml`](./.github/workflows/ci.yml)) additionally runs `format:check`, `knip` (non-blocking), and `build` on every push to `main` and every pull request.

Husky installs a pre-commit hook that runs `lint-staged` (ESLint `--fix` + Prettier) on staged files. It is installed automatically by `npm install` via the `prepare` script.

---

## Project structure

```text
app/                    App Router routes
  layout.tsx            Root layout: fonts, metadata, app shell
  page.tsx              Home
  globals.css           Neo Brutalism tokens, status tokens, custom utilities
  decks|cards|wishlist|settings/page.tsx
components/
  app-shell/            AppLayout + BottomNav
  shared/               Cross-feature presentational components
  ui/                   shadcn/ui primitives (audited for the theme)
lib/utils.ts            cn() class merge helper
types/index.ts          Shared domain unions, mirrored from docs/data-model.md
tests/
  setup/                Vitest setup
  unit/                 Unit tests
docs/                   Phase 0 product definition (spec, data model, ADRs)
build-plan/             Phase-by-phase build documents
```

---

## Theme

The single source of design truth is the tweakcn Neo Brutalism theme, imported into [`app/globals.css`](./app/globals.css). Per [ADR-010](./docs/decisions.md):

- `--radius: 0px` — nothing is rounded.
- Hard black borders (`border-2` and up), no soft rings.
- Hard **non-blurred** offset shadows. The elevation scale was flattened to pure offsets, and `shadow-brutal{,-sm,-lg}` utilities cast a 2/4/6px offset in the border colour.
- DM Sans (sans) and Space Mono (mono), loaded via `next/font/google`.
- Forbidden: glassmorphism, blurred shadows, gradients, rounded cards, sub-44px tap targets.

shadcn primitives are **not** used as generated — `Button`, `Card`, `Input`, and `Badge` were audited after `shadcn init` to strip rounding and blurred shadows and to raise controls to a 44px minimum height.

### Semantic status tokens

`--status-current`, `--status-add`, `--status-cut`, `--status-consider`, `--status-commander`, and `--warning` are derived from the theme's chart ramp and exposed as Tailwind colours (`bg-status-add`, `text-status-add-foreground`, …). Status is never signalled by colour alone: every badge also carries a text label and an icon.

---

## Deployment (Vercel)

Deck data never leaves the device, so there is nothing to provision beyond the static/SSR host.

**Manual steps — these require an interactive login and have not been performed automatically:**

1. Push this repository to GitHub (`git remote add origin …` then `git push -u origin main`).
2. In the Vercel dashboard, **Add New → Project** and import the repository. Framework preset: Next.js. Build command, output directory, and install command are auto-detected; no overrides are needed.
3. Under **Settings → Environment Variables**, add `NEXT_PUBLIC_APP_URL` for Production (the production URL) and Preview (`$VERCEL_URL` or the preview URL).
4. Confirm **Production Branch** is `main`. Preview deployments for pull requests are enabled by default.
5. Recommended — GitHub **Settings → Branches → Add rule** for `main`: require the `quality` status check to pass before merging.
6. Record the deployment URL below and verify the theme on a physical iPhone in mobile Safari.

| Environment | URL                |
| ----------- | ------------------ |
| Production  | _not yet deployed_ |
| Preview     | per pull request   |

`[OPEN-02]` in the decision log is still open: a custom domain should be chosen before Phase 16, because reinstalling the Home Screen app from a new domain starts from empty storage.

---

## Out of scope in Phase 1

PWA manifest and service worker (Phase 2), Dexie/IndexedDB (Phase 3), Scryfall integration (Phase 4), deck features (Phase 5+), desktop sidebar (Phase 14).
