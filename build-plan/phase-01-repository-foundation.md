# Phase 01 — Repository & Foundation

## Agent Handoff Prompt

```
You are implementing Phase 1 (Repository & Foundation) of the MTG Deck Builder PWA.

Workspace: mtg-deck-manager
Read first:
- plans/mtg-deck-builder-web-app-build-plan.md (sections 4, 5, 32, 36, 37, 44, 47)
- docs/product-spec.md, docs/data-model.md (from Phase 0)
- build-plan/phase-01-repository-foundation.md (this document)

Deliverables:
1. GitHub-ready Next.js 15 App Router project with TypeScript (strict)
2. Tailwind CSS + shadcn/ui initialized
3. Neo Brutalism theme from https://tweakcn.com/r/themes/neo-brutalism.json applied
4. ESLint + Prettier + Husky + lint-staged configured
5. Knip configured (report-only in CI until Phase 15)
6. Vitest stub + smoke test; npm scripts including verify
7. Mobile-first app shell: bottom nav (Home, Decks, Cards, Wishlist, Settings), placeholder pages
8. GitHub Actions CI: lint + format:check + typecheck + knip (|| true) + test:unit + build
9. Deployed empty app on Vercel (preview + production from main)

Read build-plan/automation-strategy.md — implement Phase 1 automation tasks.

Do NOT implement Dexie (Phase 3), PWA manifest/SW (Phase 2), or Scryfall (Phase 4).

Exit: App loads on Vercel with correct Neo Brutalism theme; mobile bottom nav visible; CI green; npm run verify passes.
```

## Overview

Phase 1 creates the **application skeleton**: repository structure, tooling, design system, mobile shell, and deployment pipeline. Every later phase builds on this foundation.

The Neo Brutalism theme must be applied faithfully — zero border-radius, hard black borders, offset shadows, DM Sans + Space Mono fonts. Do not substitute a generic rounded shadcn default.

## Goal

A deployable Next.js application with correct theme, mobile layout shell, and CI/CD to Vercel.

## Prerequisites

- **Phase 0:** `docs/product-spec.md`, `docs/data-model.md` exist.
- Node.js 20+, npm, Git, GitHub account, Vercel account.

## Dependencies on Previous Phases

| Phase   | Requirement                                                      |
| ------- | ---------------------------------------------------------------- |
| Phase 0 | Product spec and data model docs for route naming and nav labels |

## Duration Estimate

| Skill Level | Estimate |
| ----------- | -------- |
| Experienced | 1–2 days |
| Moderate    | 2–3 days |

## Architecture & Key Decisions

### Stack versions (target)

- Next.js 15 (App Router)
- React 19
- TypeScript 5.x (`strict: true`)
- Tailwind CSS 4.x (or 3.x per shadcn compatibility)
- shadcn/ui (latest CLI init)

### App Router structure

```text
app/
  layout.tsx          # Root layout, fonts, providers
  page.tsx            # Home placeholder
  globals.css         # Theme CSS variables
  manifest.ts         # Stub only — full PWA in Phase 2
  decks/page.tsx
  cards/page.tsx
  wishlist/page.tsx
  settings/page.tsx
components/
  app-shell/
    app-layout.tsx
    bottom-nav.tsx
  ui/                 # shadcn components
lib/
  utils.ts            # cn() helper
types/
  index.ts            # Re-export from docs/data-model when ready
```

### Neo Brutalism theme application

1. Fetch theme JSON from `https://tweakcn.com/r/themes/neo-brutalism.json`
2. Map CSS variables to `globals.css` (`:root` and `.dark` if used)
3. Override shadcn `--radius: 0rem`
4. Configure `tailwind.config` with theme colors, font families
5. Add shadow utilities matching offset black shadow pattern

Semantic status tokens (for later phases):

```css
--status-current: var(--primary);
--status-add: var(--chart-2); /* green */
--status-cut: var(--destructive);
--status-consider: var(--chart-4); /* yellow */
```

### Mobile-first shell

- Bottom navigation fixed with safe-area padding (`env(safe-area-inset-bottom)`)
- Min tap target 44×44px
- Max content width on desktop with optional sidebar (Phase 14)

## Data Model Impact

None in this phase. Create `types/index.ts` stub re-exporting interfaces from Phase 0 docs (copy manually or generate).

## Routes / Screens

| Route       | Phase 1 deliverable                                |
| ----------- | -------------------------------------------------- |
| `/`         | Home — welcome + "Install app" placeholder link    |
| `/decks`    | Empty state: "No decks yet"                        |
| `/cards`    | Empty state: "Search coming soon"                  |
| `/wishlist` | Empty state                                        |
| `/settings` | Empty state with nav link stub to `/settings/data` |

## File Structure

### Create

```text
package.json
tsconfig.json (strict)
next.config.ts
tailwind.config.ts
postcss.config.mjs
.eslintrc.json or eslint.config.mjs
.prettierrc
.prettierignore
knip.json
lint-staged.config.js
.husky/pre-commit
vitest.config.ts
tests/setup/vitest.setup.ts
tests/unit/smoke.test.ts
.github/workflows/ci.yml
app/layout.tsx
app/page.tsx
app/globals.css
app/decks/page.tsx
app/cards/page.tsx
app/wishlist/page.tsx
app/settings/page.tsx
components/app-shell/app-layout.tsx
components/app-shell/bottom-nav.tsx
components/shared/empty-state.tsx
lib/utils.ts
public/icons/ (placeholder)
.env.example
README.md (project setup instructions)
```

## Detailed Task List

### Repository setup

- [ ] Initialize git repo if not exists; `.gitignore` for node_modules, .env, .next
- [ ] Create GitHub repository; push initial commit
- [ ] Add README with local dev instructions

### Next.js scaffold

- [ ] `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"`
- [ ] Verify `npm run dev` works
- [ ] Enable `strict: true` in tsconfig; fix any immediate issues

### shadcn/ui

- [ ] `npx shadcn@latest init` (New York or Default — match Neo Brutalism sharp edges)
- [ ] Add initial components: `button`, `card`, `input`, `badge`, `separator`
- [ ] Set `--radius: 0` in components.json / CSS

### Neo Brutalism theme

- [ ] Download/import tweakcn theme variables into `globals.css`
- [ ] Configure fonts: DM Sans (sans), Space Mono (mono) via `next/font/google`
- [ ] Apply to root layout; verify buttons/cards use zero radius and hard borders
- [ ] Create sample page section showing theme tokens (dev-only or home page)

### App shell

- [ ] `AppLayout` wrapper with main content area + bottom nav
- [ ] `BottomNav` with 5 items: Home, Decks, Cards, Wishlist, Settings (Lucide icons)
- [ ] Active route highlighting
- [ ] `EmptyState` shared component for placeholder pages

### Tooling & automation (see automation-strategy.md)

- [ ] Prettier config; `format` and `format:check` scripts
- [ ] ESLint extends `next/core-web-vitals` + `@typescript-eslint/recommended`
- [ ] ESLint `--max-warnings 0` in CI
- [ ] `typecheck` script: `tsc --noEmit`
- [ ] Install and configure **Knip** — `knip.json` entry points for `app/**`
- [ ] Install **Vitest** — empty config, one smoke test (`expect(true).toBe(true)`)
- [ ] Install **Husky** + **lint-staged** — pre-commit runs eslint + prettier on staged files
- [ ] `verify` script: `typecheck && lint && test:unit` (minimal until Phase 3)
- [ ] Document all scripts in README

### CI/CD

- [ ] `.github/workflows/ci.yml`: checkout → npm ci → lint → format:check → typecheck → knip (|| true) → test:unit → build
- [ ] Connect repo to Vercel; enable preview deployments on PR
- [ ] Production deploy from `main`
- [ ] Set `NEXT_PUBLIC_APP_URL` in Vercel env
- [ ] Branch protection: require CI pass before merge (recommended)

### Vercel deployment

- [ ] First deploy succeeds
- [ ] Preview URL loads on mobile Safari
- [ ] Verify theme renders correctly on deployed URL (not just localhost)

## Implementation Notes

### create-next-app on existing repo

If repo already has `plans/` and `build-plan/`, run create-next-app in place or merge carefully.

### Bottom nav example structure

```tsx
const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/decks", label: "Decks", icon: Layers },
  { href: "/cards", label: "Cards", icon: Search },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/settings", label: "Settings", icon: Settings },
];
```

### CI workflow (Phase 1 target)

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
      - run: npm run knip || true
      - run: npm run test:unit
      - run: npm run build
```

## Automation & Quality Gates

Reference: [`automation-strategy.md`](./automation-strategy.md)

| Gate       | Phase 1 action                                             |
| ---------- | ---------------------------------------------------------- |
| ESLint     | Zero warnings policy; fix all issues before phase complete |
| Prettier   | `format:check` in CI                                       |
| TypeScript | `strict: true`; `typecheck` in CI                          |
| Knip       | Installed; report-only (`                                  |     | true`) until Phase 15 |
| Vitest     | Stub + smoke test; `test:unit` in CI                       |
| Husky      | Pre-commit lint-staged on every commit                     |
| TestCafe   | Not yet — Phase 5                                          |
| E2E in CI  | Not yet — Phase 5 smoke optional                           |

**Packages to install:**

```bash
npm install -D vitest @vitest/coverage-v8 knip husky lint-staged prettier eslint-config-prettier
npx husky init
```

## Testing Checklist

- [ ] `npm run dev` — app loads, bottom nav works, all 5 routes reachable
- [ ] `npm run build` — zero errors
- [ ] `npm run lint` — passes
- [ ] Theme: zero border-radius on buttons/cards; offset shadows visible
- [ ] Mobile viewport (375px): bottom nav not obscured; safe area respected
- [ ] Vercel preview URL loads
- [ ] `npm run verify` — passes locally
- [ ] `npm run knip` — runs (warnings OK in Phase 1)
- [ ] Pre-commit hook runs on `git commit`
- [ ] GitHub Actions CI green on push

## Exit Criteria

- App loads on Vercel with Neo Brutalism theme applied
- GitHub → Vercel deploy pipeline works
- Mobile layout with bottom navigation exists
- CI runs lint + format:check + typecheck + test:unit + build on every push
- Husky pre-commit active; Knip + Vitest configured for later phases

## Risks & Mitigations

| Risk                                | Mitigation                                        |
| ----------------------------------- | ------------------------------------------------- |
| shadcn defaults override theme      | Force `--radius: 0`; audit Button/Card components |
| Tailwind v4 vs shadcn compatibility | Pin versions documented in README                 |
| Vercel build fails on strict TS     | Fix in Phase 1, not deferred                      |

## Out of Scope

- PWA manifest, service worker (Phase 2)
- Dexie / IndexedDB (Phase 3)
- Real data or Scryfall (Phase 4+)
- Desktop sidebar (Phase 14)

## Handoff to Next Phase

Before **Phase 2** and **Phase 3** (can start in parallel after Phase 1):

1. Vercel deployment URL documented in README
2. Theme verified on deployed mobile Safari
3. App shell routes exist and are navigable
4. `npm run verify` passes; CI workflow matches automation-strategy.md Phase 1 gate

Phase 2 agent adds PWA; Phase 3 agent adds Dexie + real Vitest tests — both assume Phase 1 automation baseline exists.
