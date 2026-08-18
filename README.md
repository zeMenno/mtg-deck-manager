# MTG Deck Builder

Mobile-first, local-first Progressive Web App for maintaining Magic: The Gathering Commander decks. Every card in a deck carries a status — CURRENT, ADD, CUT, or CONSIDER — plus role and synergy tags, and the app derives the current deck, the projected deck, the shopping list, and the upgrade cost from that single model.

- **Product spec:** [`docs/product-spec.md`](./docs/product-spec.md)
- **Data model:** [`docs/data-model.md`](./docs/data-model.md)
- **Decision log (ADRs):** [`docs/decisions.md`](./docs/decisions.md)
- **Build plan:** [`build-plan/README.md`](./build-plan/README.md)
- **Automation strategy:** [`build-plan/automation-strategy.md`](./build-plan/automation-strategy.md)

> **Current status: Phase 2 (PWA Foundation) complete.** The app is installable to an iPhone Home Screen, launches standalone, and its shell survives going offline. There is still no local database, card search, or deck editing; those arrive in Phases 3, 4, and 5.

---

## Stack

| Concern        | Choice                          | Version |
| -------------- | ------------------------------- | ------- |
| Framework      | Next.js (App Router)            | 15.5.x  |
| UI runtime     | React                           | 19.1.x  |
| Language       | TypeScript (`strict`)           | 5.9.x   |
| Styling        | Tailwind CSS (CSS-first config) | 4.3.x   |
| Components     | shadcn/ui (`new-york` style)    | CLI 4.x |
| Icons          | lucide-react                    | 1.x     |
| Service worker | Serwist (`@serwist/next`)       | 9.5.12  |
| Theme          | tweakcn Neo Brutalism           | —       |
| Unit tests     | Vitest                          | 4.x     |
| E2E (later)    | TestCafe (Phase 5+)             | —       |
| Hosting        | Vercel                          | —       |

Versions are pinned deliberately: Next 15 + React 19 + Tailwind 4 is the combination the build plan targets. Do not upgrade to Next 16 without an ADR. `@serwist/next` and `serwist` are pinned to an exact version because the plugin reaches into the Next.js build (Phase 2 risk register).

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

| Script                   | What it does                                                         |
| ------------------------ | -------------------------------------------------------------------- |
| `npm run dev`            | Next dev server on port 3000                                         |
| `npm run build`          | Production build                                                     |
| `npm start`              | Serve the production build                                           |
| `npm run lint`           | ESLint over the repo, `--max-warnings 0`                             |
| `npm run lint:fix`       | ESLint with autofix                                                  |
| `npm run format`         | Prettier write                                                       |
| `npm run format:check`   | Prettier check (CI gate)                                             |
| `npm run typecheck`      | `tsc --noEmit`                                                       |
| `npm run knip`           | Unused files, exports, and dependencies (report-only until Phase 15) |
| `npm run icons:generate` | Regenerates `public/icons/*.png` from `scripts/generate-icons.mjs`   |
| `npm test`               | Vitest in watch mode                                                 |
| `npm run test:unit`      | Vitest unit project, single run                                      |
| `npm run test:ci`        | Vitest with coverage                                                 |
| `npm run verify`         | `typecheck` → `lint` → `test:unit`. Run this before every commit.    |

### Quality gates

`npm run verify` is the local gate. CI ([`.github/workflows/ci.yml`](./.github/workflows/ci.yml)) additionally runs `format:check`, `knip` (non-blocking), and `build` on every push to `main` and every pull request.

Husky installs a pre-commit hook that runs `lint-staged` (ESLint `--fix` + Prettier) on staged files. It is installed automatically by `npm install` via the `prepare` script.

---

## Project structure

```text
app/                    App Router routes
  layout.tsx            Root layout: fonts, metadata, iOS meta tags, app shell
  page.tsx              Home (hosts the install banner)
  manifest.ts           Web app manifest → /manifest.webmanifest
  sw.ts                 Serwist service worker source → public/sw.js
  offline/page.tsx      Offline fallback for uncached navigations
  globals.css           Neo Brutalism tokens, status tokens, custom utilities
  settings/install/     iPhone Add to Home Screen guide
  decks|cards|wishlist|settings/page.tsx
components/
  app-shell/            AppLayout + BottomNav
  pwa/                  InstallBanner, UpdatePrompt, OfflineIndicator
  shared/               Cross-feature presentational components
  ui/                   shadcn/ui primitives (audited for the theme)
lib/
  pwa/                  SW registration, update hook, standalone detection
  utils.ts              cn() class merge helper
scripts/
  generate-icons.mjs    Generates the PWA icon set (npm run icons:generate)
public/icons/           Generated PNG icons (192, 512, maskable, apple-touch)
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

## PWA (Phase 2)

### Installing on iPhone

iOS gives websites no install API — `beforeinstallprompt` does not exist in Safari — so installation is a documented manual flow at **[`/settings/install`](./app/settings/install/page.tsx)**: Safari → Share → Add to Home Screen. The Home page shows a dismissible banner linking to it whenever the app is _not_ running standalone.

The banner exists mainly to warn about **storage isolation**: WebKit gives a Home Screen web app a different storage bucket than the Safari tab it was installed from. Decks built in the tab do not appear in the installed app, and the only migration path is export/import (Phase 10). Install before building the first deck ([ADR-001](./docs/decisions.md)).

Standalone mode is detected with `display-mode: standalone` plus the non-standard `navigator.standalone` for older iOS (`lib/pwa/use-is-standalone.ts`). Both are unavailable during SSR, so the hook returns `false` on the first render and the banner appears only after hydration.

### Manifest and icons

[`app/manifest.ts`](./app/manifest.ts) is served at `/manifest.webmanifest` with `display: standalone`, `orientation: portrait`, `theme_color: #000000` (the theme's hard border black) and `background_color: #ffffff`.

Icons are **generated, not hand-drawn**: `npm run icons:generate` renders `public/icons/{icon-192,icon-512,icon-512-maskable,apple-touch-icon}.png` from rectangles in the three theme colours via sharp. Edit `scripts/generate-icons.mjs` and re-run; never edit the PNGs. The maskable variant keeps the mark inside the safe zone and bleeds the red field to the edge. A unit test asserts that every icon the manifest references exists on disk.

`apple-touch-icon` and `apple-mobile-web-app-*` tags come from the root layout. Note that Next's metadata API emits only the standardized `mobile-web-app-capable`, so the legacy `apple-mobile-web-app-capable` tag is written explicitly in `app/layout.tsx` for iOS below 16.4. `statusBarStyle: black-translucent` means the page draws under the status bar, which is why the header carries the `pt-safe` utility alongside the bottom nav's `pb-safe`.

### Service worker & cache versions

The worker source is [`app/sw.ts`](./app/sw.ts), bundled by `@serwist/next` to `public/sw.js` at build time (a git-ignored build artifact). It is **disabled in development** so HMR never serves stale bundles, and registration is owned by `lib/pwa/register-sw.ts` rather than the plugin (`register: false`).

| Cache                                      | Contents                                             | Strategy                       |
| ------------------------------------------ | ---------------------------------------------------- | ------------------------------ |
| `app-shell-v1`                             | Precache manifest: JS chunks, CSS, fonts, `/offline` | Precache on install            |
| `static-v1`                                | `/icons/*` and font requests                         | CacheFirst, 1 year, 64 max     |
| `pages`, `pages-rsc`, `pages-rsc-prefetch` | HTML documents and RSC payloads of visited routes    | NetworkFirst (Serwist default) |
| `static-*-assets`, `next-image`, `others`  | Remaining same-origin requests                       | Serwist `defaultCache`         |
| —                                          | `/api/*`                                             | NetworkOnly, never cached      |
| _(Phase 9)_                                | Scryfall card images (`card-images-v1`)              | CacheFirst + offline prefetch  |

Route documents are cached on visit rather than precached, which is why offline navigation works for routes the user has already opened and falls back to `/offline` for ones they have not.

`CACHE_VERSION` at the top of `app/sw.ts` is the single knob: bump it when a cache's contents or strategy change in a way that must invalidate what is already on a device. `cleanupOutdatedCaches` then deletes the superseded precache on activate. Phase 15's automated SW tests should assert against these names.

### Update strategy

The worker is built with `skipWaiting: false` on purpose, so a new version installs and then **waits** instead of swapping bundles under someone mid-edit.

1. `lib/pwa/register-sw.ts` registers `/sw.js` and watches for a `waiting` worker (both on load and via `updatefound`). A first install is ignored — no controller means there is nothing to update from.
2. `useServiceWorker()` exposes `updateReady`, and `components/pwa/update-prompt.tsx` renders a "New version available — Reload" bar.
3. Reload posts `{ type: "SKIP_WAITING" }`; Serwist activates the waiting worker, `clientsClaim` takes over the page, and the `controllerchange` event triggers exactly one `window.location.reload()`.

A failed registration is swallowed deliberately: without a service worker the app still works, it just loses offline support.

### Offline behaviour

After one online load, the app shell and visited routes are served from cache. Document requests that miss the cache fall back to the precached `/offline` page rather than the browser's error page. `components/pwa/offline-indicator.tsx` (a Phase 2 stub; Phase 14 polishes it) shows a bar driven by `navigator.onLine`.

Verify locally:

```bash
npm run build && npm start
# Chrome DevTools → Application → Manifest    (installability, icons)
# Chrome DevTools → Application → Service Workers (activated, waiting states)
# Chrome DevTools → Network → Offline, then reload and navigate the bottom nav
```

**Requires manual sign-off.** Phase 2 verified the build artifacts automatically — every icon, `/manifest.webmanifest`, `/sw.js`, the emitted iOS meta tags, and the generated precache manifest. The browser-level checks above and real Add-to-Home-Screen, standalone launch, and airplane-mode testing need a browser and an HTTPS origin, so they are still open. Work through the Installation & Standalone, Offline, and Service Worker sections of [`build-plan/checklists/iphone-safari-manual.md`](./build-plan/checklists/iphone-safari-manual.md) against the first Vercel URL.

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
7. **Phase 2 follow-up:** with the HTTPS URL live, install the app to an iPhone Home Screen and complete the Installation & Standalone, Offline, and Service Worker sections of [`build-plan/checklists/iphone-safari-manual.md`](./build-plan/checklists/iphone-safari-manual.md). Deploy a second time to confirm the update prompt appears.

| Environment | URL                |
| ----------- | ------------------ |
| Production  | _not yet deployed_ |
| Preview     | per pull request   |

`[OPEN-02]` in the decision log is still open: a custom domain should be chosen before Phase 16, because reinstalling the Home Screen app from a new domain starts from empty storage.

---

## Out of scope in Phase 2

Dexie/IndexedDB and offline deck persistence (Phase 3), Scryfall integration and its offline fallback (Phase 4), deck features (Phase 5+), card image prefetching (Phase 9), polished offline and loading states (Phase 14), automated service worker tests (Phase 15).
