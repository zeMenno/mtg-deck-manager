# Phase 09 — Images & Display Modes

## Agent Handoff Prompt

```
You are implementing Phase 9 (Images & Display Modes) of the MTG Deck Builder PWA.

Workspace: mtg-deck-manager
Read first: plans/mtg-deck-builder-web-app-build-plan.md (sections 25, 33, 41, 27)
Prior phases assumed complete: Scryfall card cache with image URLs, deck card lists, pricing UI (Phase 8), PWA service worker (Phase 2).

Deliverables:
1. CardImage component with loading/error/placeholder states, Scryfall URL sizing
2. Three density modes: compact, comfortable, image — applied to deck card lists globally
3. Global "Images: ON/OFF" toggle (when OFF, force compact-like layout without thumbnails)
4. Lazy loading for card images (native loading="lazy" + Intersection Observer for image mode lists)
5. Persist density + image toggle in Dexie settings
6. Settings UI for display preferences (appearance section)
7. Optional: "Download deck images for offline" prefetch action using service worker cache
8. Wire density into deck-card-row, card search results, wishlist rows, changes screens

Constraints:
- Do NOT download entire MTG image database to IndexedDB — URLs only in Card records
- Image mode must not render 100 full-size images without virtualization/lazy load
- Neo Brutalism: thick borders on image thumbnails, hard shadow optional
- Respect reduced-motion preference for image fade-in

Exit: User toggles compact ↔ image mode globally; deck list updates instantly; images lazy-load; preference survives reload.
```

## Overview

Phase 9 makes the card browsing experience **fast in compact mode** and **visual in image mode**, with a persisted global preference. Card images come from Scryfall URLs already stored on `Card` records — the browser and service worker handle caching, not IndexedDB blobs.

This phase is critical for iPhone usability: long deck lists must remain scrollable without loading every card face upfront.

## Goal

Enable users to:

- Toggle **Images ON/OFF** globally from any deck list context
- Choose **density**: Compact | Comfortable | Image
- See card art in lists, search results, and detail views with consistent sizing
- Experience fast scroll performance via lazy loading
- Optionally prefetch active deck images for offline viewing
- Have preferences persist across sessions and PWA relaunch

## Prerequisites

- Phase 2 complete: Service worker with cache versioning (`card-images-v1` or equivalent)
- Phase 4 complete: `Card.imageSmall`, `imageNormal`, `imageLarge` populated from Scryfall
- Phase 5 complete: `deck-card-row`, deck card list with sort/filter
- Phase 7 complete: changes screens with card rows
- Phase 8 complete (soft): price display in rows — density affects price layout

## Dependencies on Previous Phases

| Prior Phase | Dependency                                                |
| ----------- | --------------------------------------------------------- |
| Phase 2     | Service worker for optional image prefetch/cache          |
| Phase 4     | Image URLs on Card model; double-faced card face images   |
| Phase 5     | Deck card list, card search results                       |
| Phase 7     | Need-to-Add / Cards-to-Cut lists reuse same row component |
| Phase 8     | Price column layout varies by density                     |

## Duration Estimate

**3–4 days** for a single developer.

| Sub-task                                      | Estimate  |
| --------------------------------------------- | --------- |
| CardImage component                           | 0.5 day   |
| Density modes + row layouts                   | 1 day     |
| Settings persistence + toggle UI              | 0.5 day   |
| Lazy loading + list virtualization assessment | 0.5 day   |
| Offline prefetch action                       | 0.5–1 day |
| Testing on iPhone                             | 0.5 day   |

## Architecture & Key Decisions

### Display settings model

```ts
type DisplayDensity = "compact" | "comfortable" | "image";

interface DisplayPreferences {
  imagesEnabled: boolean; // master toggle
  density: DisplayDensity; // when imagesEnabled=false, treat as 'compact'
}
```

**Persistence keys** (Dexie `settings` table):

```text
display.imagesEnabled  → boolean (default true)
display.density        → DisplayDensity (default 'comfortable')
```

**Decision:** `imagesEnabled: false` overrides density — no thumbnails anywhere except card detail sheet (detail always shows large image when available).

### Scryfall image URL tiers

| Use case            | Field         | Typical size                                  |
| ------------------- | ------------- | --------------------------------------------- |
| List thumbnail      | `imageSmall`  | ~146px wide                                   |
| Row comfortable     | `imageNormal` | ~488px — use only in image mode single column |
| Detail / fullscreen | `imageLarge`  | ~672px                                        |
| Prefetch offline    | `imageNormal` | balance quality vs storage                    |

Use `CardFace` images for DFCs — default to front face (`imageSmall` on root or `card_faces[0]`).

### CardImage component contract

```tsx
interface CardImageProps {
  card: Pick<Card, "id" | "name" | "imageSmall" | "imageNormal" | "imageLarge">;
  size?: "xs" | "sm" | "md" | "lg" | "full";
  priority?: boolean; // skip lazy for above-fold (commander)
  className?: string;
  onClick?: () => void;
}
```

**Behavior:**

1. Show skeleton placeholder (gray brutalist box with border)
2. Load selected URL with `loading="lazy"` unless `priority`
3. On error: show fallback with card name initials or generic card back SVG
4. `alt={card.name}` always set
5. `decoding="async"`
6. Optional fade-in (respect `prefers-reduced-motion`)

### Density mode layouts

#### Compact

```text
┌──────────────────────────────────┐
│ Adeline, Resplendent Cathar      │
│ Creature — Human Knight · MV 3   │
│ ADD · Anthem · Token · $0.45     │
└──────────────────────────────────┘
```

- No thumbnail
- Single-line name (truncate with ellipsis)
- Minimal vertical padding (py-2)
- Smallest font sizes

#### Comfortable (default)

```text
┌──────────────────────────────────┐
│ Adeline, Resplendent Cathar      │
│ Creature — Human Knight          │
│ MV 3 · ADD · Anthem · Token      │
│ $0.45 · TCGplayer ↗              │
└──────────────────────────────────┘
```

- Optional small thumbnail (48×67px) when `imagesEnabled`
- Two-line type/metadata
- Price + actions visible

#### Image

```text
┌──────────┬───────────────────────┐
│  CARD    │ Adeline               │
│  IMG     │ ADD · MV 3            │
│  sm/md   │ Anthem / Token        │
│          │ $0.45                 │
└──────────┴───────────────────────┘
```

- Left column: `CardImage` size `sm` (~63px wide)
- Requires `imagesEnabled`; if disabled, fall back to comfortable
- Taller rows — **must lazy load** and consider virtualized list for 100+ cards

### Global toggle UX

Place in:

1. **Sticky toolbar** on deck card list (icon button + label)
2. **Settings → Appearance** (full control)

Toggle cycle options:

- **Quick toggle:** Images ON/OFF only (keeps density)
- **Density picker:** Segmented control `Compact | Comfortable | Image`

Mobile: use icon buttons (LayoutList, LayoutGrid, Image) with active state (brutalist inset border).

### Lazy loading strategy

1. **Native:** `loading="lazy"` on all `<img>` except `priority` commander
2. **Intersection Observer hook** (`useLazyMount`) for image mode — don't mount `<img>` until row near viewport
3. **List virtualization:** If `@tanstack/react-virtual` already in project or list > 60 items in image mode, virtualize

**Decision:** MVP threshold — virtualize when `deckCards.length > 75` AND density === `'image'`.

### Offline image prefetch

Action on deck dashboard:

```text
[ Download deck images for offline ]
```

**Implementation:**

1. Collect unique `imageNormal` URLs from deck's cards (all zones/statuses)
2. Pass to service worker via `postMessage` or dedicated `lib/pwa/prefetch-images.ts`
3. SW uses `cache.addAll()` in chunks of 20 with progress events
4. Store prefetch metadata in `appMeta`: `{ deckId, cachedAt, imageCount }`
5. Show progress bar; handle failures per-URL without aborting entire job

**Do NOT** store images in Dexie. Cache Storage API only.

### Integration with service worker

Extend existing SW cache strategy:

```text
card-images-v1 → cache-first for Scryfall CDN URLs (*.scryfall.io)
```

Ensure cache busting on SW update doesn't wipe user prefetched deck cache without warning — use separate cache name `deck-images-{deckId}-v1` or include in `card-images-v1`.

## Data Model Impact

### Settings (additions only)

```ts
// No new Dexie tables
'display.imagesEnabled': boolean
'display.density': 'compact' | 'comfortable' | 'image'
```

### appMeta (optional)

```ts
interface DeckImageCacheMeta {
  key: `deckImageCache.${deckId}`;
  value: {
    cachedAt: string;
    imageCount: number;
    failedUrls: string[];
  };
}
```

No changes to `Card` schema — URLs already exist from Phase 4.

## Routes / Screens

| Route                     | Changes                                               |
| ------------------------- | ----------------------------------------------------- |
| `/decks/[deckId]/cards`   | Density toolbar, row layout switching                 |
| `/decks/[deckId]/changes` | Same row component                                    |
| `/decks/[deckId]`         | Commander hero image (priority load), prefetch action |
| `/cards`                  | Search result density follows global setting          |
| `/wishlist`               | Row thumbnails respect settings                       |
| `/settings`               | Appearance section                                    |
| `/settings/appearance`    | Optional dedicated sub-route                          |

## File Structure (files to create/modify)

### Create

```text
components/cards/
  card-image.tsx              # core image component
  card-image-placeholder.tsx  # skeleton + error fallback
  card-image-fallback.svg     # generic card back

components/settings/
  appearance-settings.tsx     # density + images toggle
  display-density-picker.tsx  # segmented control

components/deck/
  deck-list-toolbar.tsx       # sticky toolbar with density controls

hooks/
  use-display-preferences.ts  # read/write settings, reactive
  use-lazy-mount.ts           # Intersection Observer

lib/display/
  types.ts
  constants.ts                # IMAGE_SIZES map size → tailwind classes
  get-effective-density.ts    # imagesEnabled override logic

lib/pwa/
  prefetch-deck-images.ts     # SW communication + progress

store/
  display-preferences-store.ts  # optional Zustand for instant UI before Dexie write
```

### Modify

```text
components/deck/deck-card-row.tsx       # accept density, compose layouts
components/deck/deck-card-list.tsx      # toolbar, virtualization
components/cards/card-result.tsx        # search results
components/cards/card-detail-sheet.tsx  # always show large image
components/wishlist/wishlist-item-row.tsx
app/decks/[deckId]/cards/page.tsx
app/decks/[deckId]/page.tsx             # prefetch button
app/settings/page.tsx                   # link to appearance
public/sw.js or serwist config          # image cache route
```

## Detailed Task List

### 9.1 — Display Types & Settings

- [ ] Create `lib/display/types.ts` with `DisplayDensity`, `DisplayPreferences`
- [ ] Create `getEffectiveDensity(prefs): DisplayDensity` — returns `'compact'` when images disabled
- [ ] Add settings keys to settings repository
- [ ] Default: `imagesEnabled: true`, `density: 'comfortable'`
- [ ] Create `useDisplayPreferences()` hook with optimistic updates

### 9.2 — CardImage Component

- [ ] Create `card-image.tsx` with size variants mapped to Tailwind widths
- [ ] Map size → URL: xs/sm → `imageSmall`, md → `imageNormal`, lg/full → `imageLarge`
- [ ] Implement loading skeleton (animated pulse or static brutalist box)
- [ ] Implement error fallback component
- [ ] Support `priority` prop → `loading="eager"` + fetchpriority="high"
- [ ] Add `aspect-[488/680]` or fixed aspect ratio for consistent layout
- [ ] Neo Brutalism: `border-2 border-black`, no rounded corners
- [ ] Test with missing `imageSmall` (card not yet cached)

### 9.3 — Double-Faced Cards

- [ ] Helper `getCardImageUrl(card, size)` handles `card_faces[]`
- [ ] CardImage shows front face by default
- [ ] Card detail sheet: flip control for back face (optional MVP — at minimum show front)

### 9.4 — Deck Card Row Layouts

- [ ] Refactor `deck-card-row.tsx` into sub-layouts or variant switch:
  - [ ] `DeckCardRowCompact`
  - [ ] `DeckCardRowComfortable`
  - [ ] `DeckCardRowImage`
- [ ] Shared inner content: name, type, status badge, roles, price (Phase 8)
- [ ] Accept `density: DisplayDensity` prop
- [ ] Row height constants documented for virtualizer

### 9.5 — Deck List Toolbar

- [ ] Create sticky toolbar above card list
- [ ] Images ON/OFF toggle switch
- [ ] Density segmented control (3 options)
- [ ] Disable Image segment when images OFF (or auto-enable on select)
- [ ] Show current mode label for screen readers

### 9.6 — Wire All List Surfaces

- [ ] `/decks/[deckId]/cards` — toolbar + density
- [ ] `/decks/[deckId]/changes` — Need-to-Add, Cards-to-Cut tabs
- [ ] Card search results on `/cards`
- [ ] Wishlist rows
- [ ] Projected deck preview list (Phase 7)

### 9.7 — Lazy Loading

- [ ] Add `loading="lazy"` to CardImage default
- [ ] Create `useLazyMount(ref, rootMargin='200px')` hook
- [ ] In image mode: render placeholder until in viewport, then mount CardImage
- [ ] Commander on deck dashboard: `priority={true}`

### 9.8 — List Virtualization (conditional)

- [ ] Evaluate deck card count in `deck-card-list.tsx`
- [ ] If > 75 cards AND density === 'image': enable `@tanstack/react-virtual`
- [ ] Preserve scroll position on density change where possible
- [ ] Test scroll performance on iPhone with 100-card Commander deck

### 9.9 — Settings Appearance Page

- [ ] Create `appearance-settings.tsx`
- [ ] Images enabled toggle with description
- [ ] Density radio/segment group with visual previews (mini mock rows)
- [ ] Live preview optional (nice-to-have)
- [ ] Save on change (immediate persist to Dexie)

### 9.10 — Offline Deck Image Prefetch

- [ ] Add dashboard button "Download images for offline"
- [ ] Implement `prefetchDeckImages(deckId, onProgress)`
- [ ] Service worker handler: cache URLs in `card-images-v1`
- [ ] Show progress: "Caching 45/87 images..."
- [ ] Completion state on dashboard: "Images cached · Aug 18"
- [ ] Handle partial failures gracefully
- [ ] Cancel button for long operations

### 9.11 — Service Worker Updates

- [ ] Add Scryfall CDN pattern to SW cache config
- [ ] Cache-first for images, network fallback
- [ ] Version cache with app deploys
- [ ] Document cache size implications (~100 images × ~50KB ≈ 5MB)

### 9.12 — Card Detail Sheet

- [ ] Always show large CardImage (independent of global OFF toggle)
- [ ] Pinch/zoom optional out of scope — full width image sufficient
- [ ] Loading state for detail fetch

### 9.13 — Accessibility

- [ ] `alt` text = card name on all images
- [ ] Density toggle: keyboard accessible, aria-pressed on segments
- [ ] Don't hide status badges in compact mode — text labels required
- [ ] Reduced motion: disable fade-in transition

## Implementation Notes

### Instant preference updates

Use pattern:

1. Zustand (or React state) updates UI immediately
2. Debounced write to Dexie settings (300ms)
3. All list components subscribe via `useDisplayPreferences`

Avoid full-page reload on density change.

### Image URL security

Only allow URLs from `https://cards.scryfall.io/` (and configured CDN hosts). Reject arbitrary URLs if ever user-imported.

### Compact mode still shows commander art

Deck dashboard commander hero may always show image — distinguish **list density** from **dashboard hero**.

### Price + density (Phase 8 integration)

| Density     | Price display              |
| ----------- | -------------------------- |
| Compact     | `$0.45` only               |
| Comfortable | `$0.45 · 3h ago` truncated |
| Image       | `$0.45` below synergies    |

### Testing double-faced cards

Use `Fable of the Mirror-Breaker` and `Delver of Secrets` in test deck.

## Automation & Quality Gates

Reference: [`automation-strategy.md`](./automation-strategy.md) — Phase 9 matrix.

- [ ] **Unit tests:** image URL resolver (normal, DFC face, missing image fallback)
- [ ] **Unit tests:** density mode class mapping (compact/comfortable/image)
- [ ] **Component tests (optional):** `CardImage` lazy load + placeholder with jsdom
- [ ] **Integration test:** settings persistence for `imageDisplay` and `densityMode`
- [ ] Manual: image mode scroll performance on 100-card deck

## Testing Checklist

### Unit tests

- [ ] `getEffectiveDensity({ imagesEnabled: false, density: 'image' })` → `'compact'`
- [ ] `getCardImageUrl` returns front face for DFC
- [ ] Size mapping returns correct URL field

### Integration tests

- [ ] Change density in settings → deck list re-renders with new layout
- [ ] Toggle images OFF → no `<img>` in list rows
- [ ] Preferences persist after page reload

### Manual / iPhone

- [ ] Scroll 100-card deck in image mode — smooth, images load on approach
- [ ] Toggle compact ↔ image while scrolled mid-list — no crash
- [ ] Airplane mode after prefetch — deck images visible
- [ ] Card detail shows large image when list images OFF
- [ ] Safe area: toolbar not hidden behind home indicator

### Performance

- [ ] Lighthouse: no excessive LCP regression in compact mode
- [ ] Network tab: images not fetched for off-screen rows in image mode

## Exit Criteria

- [ ] `CardImage` component used consistently across app
- [ ] Three density modes functional on deck card list
- [ ] Global Images ON/OFF toggle persisted in settings
- [ ] Lazy loading prevents loading all images at once
- [ ] Optional deck image prefetch caches Scryfall URLs via service worker
- [ ] Preferences survive app restart and PWA relaunch
- [ ] Neo Brutalism styling on thumbnails (border, no rounded corners)
- [ ] No IndexedDB blob storage for images

## Risks & Mitigations

| Risk                                              | Mitigation                                                 |
| ------------------------------------------------- | ---------------------------------------------------------- |
| 100 images hurt scroll perf                       | Lazy load + conditional virtualization                     |
| iOS SW cache eviction                             | Prefetch is best-effort; show "may be cleared by iOS" note |
| Missing image URLs on old cached cards            | Fallback placeholder; trigger card metadata refresh        |
| Layout shift on image load                        | Fixed aspect ratio skeleton                                |
| User confusion: Images OFF but detail shows image | Short helper text in settings                              |

## Out of Scope

- Full art database download
- Custom card image uploads
- Animated card renders (foil shimmer)
- Image zoom/lightbox (optional later)
- Per-deck density override (global only in MVP)
- WebP conversion / image CDN proxy
- Card back image selection

## Handoff to Next Phase

**Phase 10 (Import/Export & Recovery)** will export `Card` metadata including image URLs but not binary images. Document in export schema that images re-fetch from Scryfall on restore.

Ensure settings export includes:

```json
{
  "display": {
    "imagesEnabled": true,
    "density": "comfortable"
  }
}
```

Display preferences hook should be registered in the backup/export service registry for Phase 10.

Deliverables for handoff:

- `useDisplayPreferences()` exported from hooks
- `CardImage` documented with size prop API
- List row component accepts `density` — no hardcoded layout in page files
