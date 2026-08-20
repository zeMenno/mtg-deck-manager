# Phase 22 — Card Grid Tiles & Magnifier

> **Status: Implemented** (v1.5.0). Grid is a fourth `DisplayDensity`. Tiles use `normal` art; the overlay uses `large` with an offline text fallback. Hover preview is `(pointer: fine)` only. Virtualization was not added: tiles use `LazyCardImage` plus `.card-tile-contain` (`content-visibility: auto`). Not measured on a throttled iPhone in this environment; first paint is gated on Dexie + lazy mount rather than mounting 99 `<img>`s.

## Agent Handoff Prompt

```
You are implementing Phase 22 (Card Grid Tiles & Magnifier) of the MTG Deck
Builder PWA.

Workspace: mtg-deck-manager
Read first:
- build-plan/phase-22-card-grid-magnifier.md (this document — follow every section)
- build-plan/phase-09-images-display-modes.md (density modes, imagesEnabled, prefetch)
- build-plan/phase-18-solar-dusk-theme.md (tokens, primitives, 44px targets)
- build-plan/phase-19-printing-switcher.md (row/detail entry points you must not break)
- docs/data-model.md (AppSettings keys)
- docs/decisions.md (ADR-023 theme, ADR-027 and ADR-028 land in this phase)

Prerequisites: Phases 0–19 complete. Phases 20–21 are not required.

Goal:
1. Add a fourth display mode, `grid`, that renders deck cards as card-shaped
   tiles (full-width card art on top, compact meta strip below) inside the
   existing zone groups (COMMANDER / MAINBOARD / SIDEBOARD / MAYBEBOARD).
2. Add a card magnifier: a fine-pointer hover preview and a full-screen zoom
   overlay (tap/click, pinch, double-tap, keyboard) that is readable enough to
   read rules text.
3. Do all of this without deleting the existing compact / comfortable / image
   list rows.

Constraints:
- Solar Dusk only. No new colour values; use existing tokens.
- Mobile-first iPhone: 44px minimum targets, safe-area insets, no hover-only
  affordance. Hover preview is an enhancement for `(pointer: fine)` only.
- Respect `imagesEnabled === false`: no remote art, no magnifier, grid falls
  back to the compact list.
- Images stay Scryfall CDN URLs through the existing CardImage / LazyCardImage
  path. Do not add next/image, an image proxy, or IndexedDB blobs.
- Do not regress the existing row consumers in components/changes/* and
  components/deck/version-detail-view.tsx.
- Honour prefers-reduced-motion for every zoom/scale transition.
- Add tests with the feature. CI must stay green.

When done, verify every Exit Criteria item and confirm CI is green.
```

## Overview

The deck cards page currently renders every card as a **horizontal row** (`DeckCardRow`) with, at best, an 88×63px thumbnail on the left. Magic cards are already a card-shaped visual object, so a row wastes the strongest recognition signal the game has: the art and frame. Users scanning a 100-card Commander deck recognise Sol Ring by its art faster than by a 14px bold name.

This phase adds a **grid of card tiles** where the art is the dominant element, keeps the zone grouping that already exists, and adds a **magnifier** so a card can actually be read (oracle text, P/T, set symbol) without leaving the list.

This is **not** a rewrite of the card list. `compact` and `comfortable` rows stay exactly as they are — they are the fastest modes for text scanning, bulk edits, and the `imagesEnabled = false` case, and three other features (`cards-to-cut-list`, `need-to-add-list`, `consider-list`, `projected-deck-view`, `version-detail-view`) depend on `DeckCardRow`.

It is also **not** a replacement for `CardDetailSheet` (Phase 17 tabs, Phase 19 printings). The magnifier answers "what does this card say"; the detail sheet answers "what do I do with this card".

## Goal

1. `DisplayDensity` gains a fourth value, `"grid"`, selectable from `DeckListToolbar` and Settings → Appearance, persisted in the existing `densityMode` setting.
2. `DeckCardGrid` + `DeckCardTile` render zone-grouped, responsive tiles (2 columns on a phone, up to 5–6 on desktop) with card art at `aspect-[488/680]` and full tile width.
3. Tapping/clicking a tile's **art** opens `CardZoomOverlay`: fits-to-screen `large` art, pinch and double-tap zoom, DFC flip, "Card details…" hand-off, Esc / swipe-down / backdrop close.
4. On a fine pointer, hovering the art shows `CardHoverPreview` after a short delay — a large floating preview, viewport-flipped, decorative and `aria-hidden`.
5. Tapping the tile's **meta strip** keeps today's behaviour (`onPress` → `DeckCardActionsSheet`); long-press keeps multi-select.
6. `imagesEnabled === false` ⇒ effective density is `compact`, grid is disabled in the picker, and the magnifier is unreachable.

## Prerequisites

- Phase 9 — `DisplayDensity`, `useDisplayPreferences`, `getEffectiveDensity`, `CardImage` / `LazyCardImage`, `IMAGE_SIZE_CLASS`, `SIZE_TO_URL_TIER`, service-worker `card-images-v1` cache, `prefetchDeckImages`.
- Phase 5 — `DeckCardWithCard`, `DeckCardActionsSheet`, multi-select, zone grouping via `DeckZoneGroup`.
- Phase 17 — DFC faces, mana symbols, `IllegalInFormatBadge`.
- Phase 18 — Solar Dusk tokens, `Sheet` primitive, motion config in `lib/ui/motion-config.ts`.
- Phase 19 — printing swaps change `card.id` and therefore art; the grid must re-render on that.

## Dependencies on Previous Phases

| Phase | Dependency |
| ----- | ---------- |
| 5 | Tap → actions sheet, long-press → multi-select, zone order |
| 9 | Density persistence, `imagesEnabled` gate, image URL tiers, lazy mount, prefetch |
| 14 | Skeletons, page transitions, safe-area utilities |
| 17 | `Card.faces` for flip, illegal badge on tiles |
| 18 | Tokens, radius, elevation, 44px targets, `motion-safe:` variants |
| 19 | Art/price update after a printing switch must be visible in tiles |

## Duration Estimate

**3–4 days** for a single developer.

| Sub-task | Estimate |
| -------- | -------- |
| `grid` density plumbing (types, store, picker, settings, exhaustive switches) | 0.5 day |
| `DeckCardTile` + `DeckCardGrid` + zone grouping reuse | 1 day |
| `CardZoomOverlay` (pinch / double-tap / flip / keyboard / a11y) | 1 day |
| `CardHoverPreview` (fine pointer, positioning, preload) | 0.5 day |
| Perf pass on a 100-card deck + tests | 0.5–1 day |

## Architecture & Key Decisions

### ADR-027 — `grid` is a fourth display mode, not a replacement for rows

`DisplayDensity` becomes `"compact" | "comfortable" | "image" | "grid"`.

Rejected alternatives:

| Alternative | Why not |
| ----------- | ------- |
| Replace rows with tiles everywhere | Breaks text scanning, bulk edit ergonomics, and the images-off path; five components depend on `DeckCardRow` |
| Add an orthogonal `layout: "list" \| "grid"` axis alongside density | Doubles the state surface (`layout × density` = 8 combinations, 5 of them meaningless) and needs a Dexie schema/settings migration for one user-visible choice |
| Turn the existing `image` density into a grid | `image` is a *row* with a bigger thumbnail and is already documented/tested in Phase 9; silently changing it rewrites shipped behaviour |

Consequences:

- The `densityMode` settings key keeps its type (`string`) — **no Dexie schema bump**. Persisted `"grid"` is simply a new valid value; unknown values must still fall back to `"comfortable"`.
- Every exhaustive `switch (density)` in `lib/display/density-classes.ts` will fail typecheck until a `grid` case is added. That is intentional — do not widen the type with a cast.
- When `density === "grid"` is passed to `DeckCardRow` (defensively, from a consumer that only renders rows), it must render as `comfortable`. Never crash a changes list because of a display preference.

### ADR-028 — The zoom overlay is the card-reading surface; hover preview is an enhancement

One reading surface, two entry points:

- `CardZoomOverlay` — works on touch, mouse, and keyboard. It is the **only** magnifier the exit criteria depend on.
- `CardHoverPreview` — renders only when `matchMedia("(pointer: fine)").matches`. It never gates functionality, is `aria-hidden`, and is never the sole way to see a card.

A DevTools-style "lens" (a magnifying circle following the cursor over the small image) is explicitly a stretch, behind `cardZoom.hoverMode`, defaulting to `"preview"`. Reading 8pt oracle text through a moving lens on a phone is worse than a full-screen image.

### Grid geometry

```text
Tile
┌──────────────────────────────┐
│  [2×]                  [ADD] │  ← quantity + status overlay chips on the art
│                              │
│        card art              │  aspect-[488/680], w-full  (≈70–75% of tile height)
│        (tier: normal)        │
│                        [🔍]  │  ← magnifier affordance, bottom-right, 44px hit area
├──────────────────────────────┤
│ Sol Ring                     │  name, truncate, 2 lines max
│ {1} · MV 1 · $1.51           │  mana cost, MV, price
│ [Ramp] [+2]                  │  tag chips: 1 visible + overflow count
└──────────────────────────────┘
```

Columns (Tailwind v4 utilities, no config file needed):

| Breakpoint | Columns |
| ---------- | ------- |
| base (≤639px) | 2 |
| `sm` (≥640px) | 3 |
| `md` (≥768px) | 4 |
| `lg` (≥1024px) | 5 |
| `xl` (≥1280px) | 6 |

Put this in one exported constant (`GRID_COLUMNS_CLASS` in `lib/display/grid-classes.ts`) so tests and the wishlist can reuse it later. Gap `gap-3`; the grid lives **inside** `DeckZoneGroup`, so headers stay `COMMANDER (1)` / `MAINBOARD (99)`.

**Image tier for tiles.** Add a `"tile"` value to `CardImageSize`:

| Size | `IMAGE_SIZE_CLASS` | `SIZE_TO_URL_TIER` |
| ---- | ------------------ | ------------------ |
| `tile` | `aspect-[488/680] w-full` | `normal` |

Do **not** use `large` for tiles — 99 large scans on a phone is tens of megabytes. `large` is the zoom overlay only.

### Performance on a 100-card deck

The existing `image` density virtualizes flat above `IMAGE_MODE_VIRTUALIZE_THRESHOLD = 75` and drops zone headers to do it. Grid keeps its headers, so solve perf in this order and stop as soon as the budget is met:

1. `LazyCardImage` already defers mounting off-screen art — reuse it, do not bypass it.
2. Add CSS containment on each tile: `content-visibility: auto` with `contain-intrinsic-size` sized from the tile aspect ratio (expose as a utility class, e.g. `.card-tile-contain` in `app/globals.css` or `styles/`).
3. Only if the budget still fails, add row-based virtualization for grid using `@tanstack/react-virtual` with a measured column count. Grouping may **not** be dropped to achieve this; virtualize per zone section instead.

**Budget (measure on a 99-card deck, iPhone-class throttling):** first meaningful tile paint under ~400ms after data, scroll frames predominantly under 16ms, and no more than the visible-plus-overscan tiles requesting images. Record what you measured in the phase notes.

**Prefetch:** `prefetchDeckImages` warms `small`/`normal`. Tiles are covered; the overlay's `large` tier is not. That is acceptable — see Offline below.

### Interaction contract (locked)

| Context | Gesture | Result |
| ------- | ------- | ------ |
| Tile, normal mode | Tap art (or magnifier button) | `CardZoomOverlay` |
| Tile, normal mode | Tap meta strip | `onPress` → `DeckCardActionsSheet` (unchanged) |
| Tile, normal mode | Long-press ≥450ms anywhere | `onLongPress` → multi-select; a pending zoom-on-tap must be cancelled |
| Tile, multi-select active | Tap anywhere | Toggle selection; zoom suppressed; magnifier button hidden |
| Tile, keyboard | Focus art, `Enter` / `Space` | `CardZoomOverlay` |
| Tile, fine pointer | Hover art ≥120ms | `CardHoverPreview`; leaving hides it immediately |
| Any, `imagesEnabled === false` | — | No art, no magnifier; density resolves to `compact` rows |
| Row modes (`comfortable`, `image`) | Tap thumbnail | `CardZoomOverlay` (same overlay, opt-in via `cardZoom.tapImageOpensZoom`) |

Nested interactive elements: the tile must **not** be a single `<button>` wrapping another `<button>`. Use a non-button container (`<div>` / `<article>`) with two explicit controls — an art button and a meta button — or one button plus an absolutely positioned magnifier button that calls `stopPropagation`. Keep `aria-pressed` on the selectable element and `data-testid="deck-card-tile-${item.id}"`.

### `CardZoomOverlay` behaviour

- Full-screen dialog: backdrop `bg-background/90` + blur, `object-contain` art capped by `100dvh` minus safe-area insets, `role="dialog"`, `aria-modal="true"`, `aria-label` = card name, focus trapped, focus restored to the invoking control on close.
- Zoom: default fit; double-tap / double-click toggles fit ↔ ~2.2× with `transform-origin` at the tap point; pinch via pointer events; `+` / `-` buttons and keys for mouse and keyboard; arrows pan when zoomed; drag to pan. Clamp scale to `[1, 4]` and clamp panning to image bounds.
- Controls (44px, safe-area aware): close, flip (only when `card.faces?.length > 1`), zoom out / in, "Card details…" which closes the overlay and opens `CardDetailSheet` for the same card.
- Motion: use `lib/ui/motion-config.ts` durations; all transforms behind `motion-safe:`. Under `prefers-reduced-motion`, zoom still works — it just snaps.
- Body scroll locked while open; dismiss on backdrop tap, Esc, and downward swipe when at fit scale (a downward drag while zoomed pans, it does not close).

Add a thin `components/ui/dialog.tsx` on the same unified `radix-ui` import style as `components/ui/sheet.tsx`. Do not force this through `Sheet`: the bottom-sheet slide, padding, and grabber fight an edge-to-edge image.

### `CardHoverPreview` behaviour

- Gate on a `useFinePointer()` hook (`lib/hooks/use-fine-pointer.ts`) wrapping `matchMedia("(pointer: fine)")` with a change listener and an SSR-safe `false` default.
- Portal to `document.body`, fixed positioning, flip horizontally/vertically to stay in the viewport, ~`320px` wide, `large` tier, `aria-hidden="true"`, `pointer-events-none`.
- 120ms open delay; cancel on pointer leave, scroll, or overlay open. Warm the URL with `new Image()` on hover start so the preview does not flash a skeleton.
- Suppressed when: `imagesEnabled === false`, `cardZoom.hoverPreview === false`, multi-select is active, or the zoom overlay is open.

### Offline

The overlay requests the `large` tier, which the deck prefetch does not store. Behaviour:

1. Try `large`.
2. On error or when `navigator.onLine === false`, fall back to the cached `normal` tier and show a small "Best available offline" note.
3. If nothing is cached, show the existing `CardImagePlaceholder` error variant plus the card's text (name, mana cost, type line, oracle text from Dexie) so the card is still *readable* offline. Never show an empty black overlay.

Optionally extend `prefetchDeckImages` with an opt-in "include large art" checkbox; if skipped, note it as a leftover.

### Settings

No new Dexie table, no schema bump. Keys in `AppSettings` (document in `docs/data-model.md`):

| Key | Type | Default |
| --- | ---- | ------- |
| `densityMode` | `"compact" \| "comfortable" \| "image" \| "grid"` | `"comfortable"` (unchanged) |
| `cardZoom.hoverPreview` | `boolean` | `true` |
| `cardZoom.tapImageOpensZoom` | `boolean` | `true` |
| `cardZoom.hoverMode` | `"preview" \| "lens"` | `"preview"` (stretch; ship the key only if the lens ships) |

Selecting Grid while images are off must auto-enable images, exactly like the existing `setDensityOrEnable` behaviour for `image`.

## File Structure

Create / modify:

```text
types/index.ts                                   — DisplayDensity += "grid"
lib/display/types.ts                             — CardImageSize += "tile"
lib/display/constants.ts                         — IMAGE_SIZE_CLASS.tile, SIZE_TO_URL_TIER.tile,
                                                   DENSITY_ROW_HEIGHT.grid, GRID_VIRTUALIZE_THRESHOLD
lib/display/density-classes.ts                   — grid cases (map to comfortable for rows)
lib/display/grid-classes.ts                      — GRID_COLUMNS_CLASS, getTileMetaClass, estimateTileHeight
lib/display/get-effective-density.ts             — images off ⇒ compact (verify grid path)
lib/hooks/use-fine-pointer.ts                    — pointer: fine media query
lib/hooks/use-card-zoom.ts                       — open/close state, current faceIndex, scale
lib/hooks/use-display-preferences.ts             — grid in setDensityOrEnable, new zoom keys
store/display-preferences-store.ts               — zoom preference fields
components/ui/dialog.tsx                         — new full-screen dialog primitive
components/cards/card-zoom-overlay.tsx           — the magnifier
components/cards/card-hover-preview.tsx          — fine-pointer preview
components/cards/card-image.tsx                  — accept "tile" size; keep CDN-only rule
components/deck/deck-card-tile.tsx               — the card component
components/deck/deck-card-grid.tsx               — responsive grid, zone-grouped
components/deck/deck-card-list.tsx               — delegate to grid when density === "grid"
components/deck/deck-card-row.tsx                — thumbnail opens zoom (opt-in), grid ⇒ comfortable
components/settings/display-density-picker.tsx   — 4th segment (LayoutGrid / Grid3x3 icon)
components/settings/appearance-settings.tsx      — grid segment + hover-preview toggle
components/shared/skeletons/deck-card-grid-skeleton.tsx — tile skeletons
app/globals.css (or styles/)                     — .card-tile-contain containment utility
docs/data-model.md                               — new settings keys
docs/decisions.md                                — ADR-027, ADR-028
tests/unit/display/grid-classes.test.ts
tests/unit/display/display-preferences.test.ts   — extend for "grid"
tests/unit/components/deck-card-tile.test.tsx
tests/unit/components/card-zoom-overlay.test.tsx
tests/unit/components/card-hover-preview.test.tsx
tests/integration/settings-persistence.test.ts   — extend for grid + zoom keys
tests/e2e/deck-card-grid.test.ts                 — TestCafe smoke
```

`DeckCardList` stays the single entry point for consumers: same props, and `density === "grid"` renders `DeckCardGrid` internally. Do not make `deck-cards-client.tsx` branch on layout.

## Detailed Task List

- [ ] Add ADR-027 (grid is a fourth mode) and ADR-028 (zoom overlay is the reading surface, hover is an enhancement) to `docs/decisions.md`.
- [ ] Widen `DisplayDensity`; fix every exhaustive switch (`getDensityRowClass`, `getDensityNameClass`, `estimateRowHeight`) with real `grid` cases, no casts.
- [ ] Add `"tile"` to `CardImageSize` with the `normal` URL tier and full-width aspect class.
- [ ] Grid classes module with `GRID_COLUMNS_CLASS` and a pure `estimateTileHeight` for future virtualization.
- [ ] `DeckCardTile`: art-dominant layout, quantity chip, status badge, illegal badge, mana cost, MV, price, 1 tag chip + overflow, selection ring, `data-testid`, no nested-button violations, 44px targets.
- [ ] `DeckCardGrid`: zone groups via existing `DeckZoneGroup`, `ZONE_ORDER` reused (extract the constant if it must be shared — do not copy it a third time; `projected-deck-view.tsx` already duplicates it).
- [ ] Wire `DeckCardList` to delegate on `density === "grid"`; keep row behaviour byte-identical otherwise.
- [ ] Add the Grid segment to `DisplayDensityPicker` + `AppearanceSettings`; auto-enable images on select; keep `aria-pressed` and the live region.
- [ ] `useFinePointer` + `CardHoverPreview` with delay, viewport flip, preload, `aria-hidden`.
- [ ] `CardZoomOverlay` with fit/pinch/double-tap/keyboard zoom, pan clamping, DFC flip, details hand-off, focus trap, scroll lock, safe-area controls, reduced-motion path.
- [ ] Offline fallback chain (`large` → cached `normal` → text-only readable state).
- [ ] Open the overlay from `comfortable` / `image` row thumbnails behind `cardZoom.tapImageOpensZoom`, without swallowing the row's `onPress`.
- [ ] Grid skeleton for the loading state; keep the existing row skeleton for row modes.
- [ ] Perf pass on a 99-card deck: containment first, virtualization only if needed; record measurements.
- [ ] `docs/data-model.md` settings table update.
- [ ] CHANGELOG entry when the implementation ships (not in the planning commit unless asked).

## Testing Checklist

- [ ] `getEffectiveDensity({ imagesEnabled: false, density: "grid" })` → `"compact"`.
- [ ] An unknown persisted `densityMode` still falls back to `"comfortable"`.
- [ ] `getCardImageUrl(card, "tile")` returns the **normal** Scryfall URL, and only from an allowlisted host.
- [ ] `DeckCardRow` given `density="grid"` renders the comfortable row and does not throw.
- [ ] Tile renders quantity (`2×`), status badge, MV, and price; missing price never renders `$0.00`.
- [ ] Tapping tile art opens the overlay; tapping the meta strip calls `onPress` and does **not** open the overlay.
- [ ] Long-press cancels a pending zoom and calls `onLongPress`.
- [ ] Multi-select mode: tap toggles selection, magnifier suppressed, `aria-pressed` reflects state.
- [ ] Overlay: Esc closes, focus returns to the invoking control, `aria-modal="true"` present, body scroll restored.
- [ ] Overlay flip button only exists for a two-faced fixture and switches `faceIndex`.
- [ ] Overlay with `imagesEnabled === false` is unreachable from tiles and rows.
- [ ] `CardHoverPreview` does not render when `matchMedia("(pointer: fine)")` reports `false` (mock it) or when the setting is off.
- [ ] Zone headers and counts are unchanged in grid mode (`COMMANDER (1)`, quantity-summed counts).
- [ ] Settings persistence round-trips `densityMode: "grid"` and the zoom keys through Dexie.
- [ ] Offline: overlay shows cached art or readable card text, never a thrown error.
- [ ] Reduced motion: no scale transition assertions fail; zoom still changes scale.

## Automation & Quality Gates

- [ ] `npm run format:check`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test:unit`
- [ ] `npm run test:integration`
- [ ] `npm run test:e2e`
- [ ] `npm run build`

## Exit Criteria

- [ ] The deck cards page offers a **Grid** mode where cards render as tiles with the art as the dominant element, still grouped by zone.
- [ ] Grid choice survives a reload (Dexie) and syncs with Settings → Appearance.
- [ ] Tapping a tile's art on iPhone opens a full-screen magnifier where the card's rules text is readable, with pinch and double-tap zoom and a working close.
- [ ] On desktop, hovering a tile's art shows an enlarged preview; the magnifier is still reachable without hover.
- [ ] Card actions (tap → actions sheet) and multi-select (long-press) still work in grid mode.
- [ ] Turning images off hides the grid option and the magnifier and returns compact rows.
- [ ] A 99-card deck in grid mode meets the stated perf budget with measurements recorded.
- [ ] Existing row modes and all `DeckCardRow` consumers are visually and behaviourally unchanged.
- [ ] CI green.

## Risks & Mitigations

| Risk | Impact | Mitigation |
| ---- | ------ | ---------- |
| 99 full-width `normal` images on a phone | Jank, data usage, memory | `tile` = normal tier only, `LazyCardImage`, CSS containment, virtualization as a last resort with a measured budget |
| Nested buttons (art inside tile button) | Invalid DOM, broken a11y, iOS double-fire | Container + two sibling controls; assert in the component test |
| Tap ambiguity (zoom vs actions vs select) | Users open the wrong surface | Locked interaction contract; art = zoom, meta = actions, long-press = select; `cardZoom.tapImageOpensZoom` escape hatch |
| Hover-only magnifier | Unusable on the primary device | ADR-028: overlay is the required path; hover gated on `pointer: fine` |
| Adding a 4th density breaks exhaustive switches at runtime | Crash in a changes list | Keep `never` checks, add real `grid` cases, map to comfortable for rows |
| `large` art unavailable offline | Empty overlay | Fallback chain ends in readable card text |
| Grid loses zone context | Users lose commander/sideboard separation | Grid renders inside `DeckZoneGroup`; never flatten to virtualize |
| Scope creep into a new card detail UI | Duplicates Phase 17/19 surfaces | Overlay only reads art; it hands off to `CardDetailSheet` |
| Dexie value drift from a hand-edited setting | Blank list | Validate on hydrate, fall back to comfortable |

## Out of Scope

- Grid mode for wishlist, search results, changes lists, and version detail (rows stay; grid may be extended in a later phase once `GRID_COLUMNS_CLASS` proves out).
- A cursor-following lens loupe (stretch only, behind `cardZoom.hoverMode`).
- Drag-and-drop reordering or drag-between-zones in the grid.
- User-configurable column count or tile size sliders.
- Art crop mode (`art_crop`), full-art frames, or custom card backs.
- Storing card images in IndexedDB, `next/image`, or an image proxy route.
- Prefetching `large` art for a whole deck by default.
- Any change to the printing selection logic (Phase 19) or tag suggestions (Phase 21).

## Handoff to Next Phase

Phase 22 leaves a reusable `DeckCardTile` / `GRID_COLUMNS_CLASS` pair and a single `CardZoomOverlay` entry point. A later phase can extend grid mode to search results and the wishlist without touching display-preference plumbing, and can reuse the overlay as the standard "read this card" surface anywhere a `Card` is available.
