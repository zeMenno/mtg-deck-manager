# Phase 02 — PWA Foundation

## Agent Handoff Prompt

```
You are implementing Phase 2 (PWA Foundation) of the MTG Deck Builder PWA.

Workspace: mtg-deck-manager
Read first:
- plans/mtg-deck-builder-web-app-build-plan.md (sections 3, 26, 27, 48)
- build-plan/phase-02-pwa-foundation.md (this document)

Prerequisites: Phase 1 complete (Next.js app deployed on Vercel with mobile shell).

Deliverables:
1. app/manifest.ts with name, icons, standalone display, theme colors
2. PWA icons: 192x192 and 512x512 minimum in public/icons/
3. iOS meta tags (apple-mobile-web-app-capable, status bar style, touch icon)
4. Service worker via Serwist (or Next.js documented PWA approach) for app shell caching
5. Offline shell: static assets + app shell load without network
6. SW update strategy: detect new version, "Reload to update" prompt
7. /settings/install page with iPhone installation instructions (Share → Add to Home Screen)
8. Onboarding banner on Home: install before building decks (iOS storage isolation warning)

Do NOT implement Dexie offline deck data (Phase 3) or card image caching (Phase 9).

Exit: App addable to iPhone Home Screen; opens standalone; app shell survives offline; install instructions page exists.
Test on physical iPhone if possible.
```

## Overview

Phase 2 makes the web app **installable and app-like on iPhone**. Safari does not support `beforeinstallprompt` — users must manually Add to Home Screen. WebKit also isolates storage between Safari and installed web apps, so onboarding must warn users to install early.

## Goal

PWA manifest, service worker, icons, and install UX so the app launches standalone from the Home Screen with offline app shell.

## Prerequisites

- **Phase 1:** Deployed Next.js app with layout and routing.
- HTTPS (Vercel preview/production provides this).

## Dependencies on Previous Phases

| Phase   | Requirement                                              |
| ------- | -------------------------------------------------------- |
| Phase 1 | `app/layout.tsx`, static assets, Vercel HTTPS deployment |

## Duration Estimate

| Skill Level | Estimate |
| ----------- | -------- |
| Experienced | 2–3 days |
| Moderate    | 3–5 days |

## Architecture & Key Decisions

### Serwist vs manual SW

Recommended: **@serwist/next** per Next.js PWA guide.

```bash
npm install @serwist/next serwist
```

Alternative: custom `public/sw.js` with manual registration (more control, more maintenance).

### Manifest (`app/manifest.ts`)

```ts
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "MTG Deck Builder",
    short_name: "Deck Builder",
    description: "Local-first MTG deck building and upgrade tracking",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
```

Adjust colors to match Neo Brutalism theme tokens.

### iOS-specific head metadata

In `app/layout.tsx`:

```tsx
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Deck Builder" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
```

### Cache strategy (Phase 2 scope)

| Cache name             | Contents              | Strategy            |
| ---------------------- | --------------------- | ------------------- |
| app-shell-v1           | HTML, JS, CSS bundles | Precache on install |
| static-v1              | fonts, icons          | CacheFirst          |
| (defer) card-images-v1 | Scryfall images       | Phase 9             |

On deploy: bump cache version, cleanup old caches, notify UI.

### iOS storage warning

Display on Home page (dismissible, persist dismissal in localStorage for now — migrate to Dexie settings in Phase 3):

> Install Deck Builder to your Home Screen before you start building decks. Safari and the installed app use separate storage.

## Data Model Impact

None. Optional: `localStorage` key for install banner dismissal until Phase 3 settings table.

## Routes / Screens

| Route               | Deliverable                                                    |
| ------------------- | -------------------------------------------------------------- |
| `/settings/install` | Step-by-step iPhone install guide with Share icon illustration |
| `/`                 | Install prompt banner (if not standalone mode)                 |

Detect standalone: `window.matchMedia('(display-mode: standalone)').matches` or `navigator.standalone` (iOS).

## File Structure

```text
app/manifest.ts
app/layout.tsx                    # iOS meta tags
app/settings/install/page.tsx
components/pwa/
  install-banner.tsx
  update-prompt.tsx
  offline-indicator.tsx           # stub — full use in Phase 14
lib/pwa/
  register-sw.ts
  use-service-worker.ts
public/icons/
  icon-192.png
  icon-512.png
  icon-512-maskable.png
  apple-touch-icon.png
next.config.ts                    # Serwist plugin config
```

## Detailed Task List

### Icons

- [ ] Design or generate Neo Brutalism-styled app icons (bold, high contrast)
- [ ] Export 192, 512, maskable 512, apple-touch-icon (180×180)
- [ ] Place in `public/icons/`
- [ ] Verify icons render in manifest and `<link rel="apple-touch-icon">`

### Web App Manifest

- [ ] Create `app/manifest.ts` with all required fields
- [ ] `display: 'standalone'`, correct `start_url`, `id`
- [ ] Theme/background colors from Neo Brutalism palette
- [ ] Validate with Chrome DevTools → Application → Manifest

### Service worker (Serwist)

- [ ] Install and configure `@serwist/next`
- [ ] Precache app shell (/_next/static, pages, fonts, icons)
- [ ] Runtime caching for fonts (CacheFirst)
- [ ] Exclude API routes from over-aggressive caching
- [ ] Version caches (`app-shell-v1`); cleanup on activate

### Update strategy

- [ ] Detect `registration.waiting` state
- [ ] `UpdatePrompt` component: "New version available — Reload"
- [ ] On reload, skip waiting and claim clients
- [ ] Document behavior in README

### Install UX

- [ ] `/settings/install` page with numbered steps for Safari iOS
- [ ] Do NOT rely on `beforeinstallprompt` (not available on iOS)
- [ ] `InstallBanner` on home when not in standalone mode
- [ ] Link from banner to install instructions
- [ ] iOS storage isolation warning copy

### Offline shell test

- [ ] Load app online once
- [ ] Enable airplane mode (or DevTools offline)
- [ ] App shell + navigation between cached routes still works
- [ ] Show friendly message for uncached dynamic content

### Layout integration

- [ ] Add link to Install guide in Settings page
- [ ] Safe area insets on bottom nav (`padding-bottom: env(safe-area-inset-bottom)`)

## Implementation Notes

### Serwist next.config example

```ts
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
});

export default withSerwist(nextConfig);
```

### Standalone detection hook

```ts
export function useIsStandalone() {
  const [standalone, setStandalone] = useState(false);
  useEffect(() => {
    setStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true,
    );
  }, []);
  return standalone;
}
```

## Automation & Quality Gates

Reference: [`automation-strategy.md`](./automation-strategy.md) — Phase 2 matrix.

- [ ] Begin [`checklists/iphone-safari-manual.md`](./checklists/iphone-safari-manual.md) — complete Install + Standalone sections on device
- [ ] Optional unit test: `useIsStandalone` hook detection logic
- [ ] Document SW cache version strategy for Phase 15 automated tests
- [ ] Verify offline shell manually (DevTools + airplane mode); no TestCafe yet

## Testing Checklist

- [ ] Manifest valid in Lighthouse PWA audit (best-effort on iOS)
- [ ] Add to Home Screen on physical iPhone (or simulator)
- [ ] Launched from Home Screen: no Safari URL bar (standalone)
- [ ] Airplane mode: app shell loads, bottom nav works
- [ ] Install instructions page readable on iPhone
- [ ] Storage warning visible before first deck (banner)
- [ ] Deploy new version → update prompt appears

## Exit Criteria

- App can be added to iPhone Home Screen
- App opens in standalone display mode
- App shell survives offline after initial load
- Install instructions and iOS storage warning exist

## Risks & Mitigations

| Risk                                  | Mitigation                                            |
| ------------------------------------- | ----------------------------------------------------- |
| iOS SW limitations                    | Test on real device; scope Phase 2 to app shell only  |
| Storage split surprises users         | Prominent install-first messaging; export in Phase 10 |
| Serwist + Next.js 15 breaking changes | Pin package versions; document in README              |

## Out of Scope

- IndexedDB offline deck editing (Phase 3)
- Scryfall API caching (Phase 4)
- Card image offline prefetch (Phase 9)
- Full offline indicator polish (Phase 14)

## Handoff to Next Phase

Before **Phase 3**:

1. Manifest and SW deployed to Vercel production/preview
2. Icons verified on installed iOS web app
3. Install page linked from Settings

Phase 3 adds Dexie — offline deck persistence layers on top of this PWA shell.

Before **Phase 4**:

PWA shell should be stable; card search will add network dependency with offline fallback to local cache.
