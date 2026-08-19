# Phase 17 — Legality Tabs, Mana Symbols & Search Filters

> **Status: Complete (in-repo v1.1.0)** (2026-08-19). Legality tabs, warn-but-allow add, symbology cache, mana rendering, and faceted search filters are implemented with unit/integration/E2E coverage. Manual iPhone QA and git tag remain human steps (shared with Phase 16 leftovers).

## Agent Handoff Prompt

```
You are implementing Phase 17 (Legality Tabs, Mana Symbols & Search Filters) of the MTG Deck Builder PWA.

Workspace: mtg-deck-manager
Read first:
- build-plan/phase-17-legality-symbols-search-filters.md (this document — follow every section)
- build-plan/README.md (context and dependencies)
- build-plan/phase-13-format-deck-validation.md (existing FormatRules / DeckWarning model)
- build-plan/phase-04-scryfall-integration.md (Scryfall client, normalize, cache)
- plans/mtg-deck-builder-web-app-build-plan.md (master reference)

Prerequisites: Phases 0–16 complete. App is live; this is a post-launch improvement phase.

Goal: Three user-facing improvements to the card experience.
1. Tabbed card detail with a full Legality tab (all Scryfall formats), plus a
   blocking-style warning when adding a card that is banned/restricted/not legal
   in the target deck's format.
2. Replace raw mana-cost strings ({2}{W}{U}) and ad-hoc color swatches with real
   MTG symbol rendering sourced from Scryfall's symbology API, cached for offline.
3. Faceted filtering in card search (colors, color identity, type, rarity, mana
   value, set, format legality) that works both online (Scryfall query syntax)
   and offline (local Dexie filtering).

Constraints:
- Do NOT block the user from adding a banned card — warn clearly, allow override.
- Symbols must degrade to readable text when SVGs are unavailable/offline-uncached.
- Filters must not break the existing plain-text search behaviour.
- Keep Neo Brutalism theme: zero radius, hard 2px borders, offset shadows.
- Mobile-first: filters live in a bottom sheet, tap targets >= 44px.
- Add unit tests with the feature; do not defer to a later phase.

When done, verify every Exit Criteria item and confirm CI is green.
```

## Overview

Phase 17 is the **first post-launch improvement phase**. It does not add a new domain concept; it closes three usability gaps found during real iPhone use of the v1.0.0 app:

1. **Legality is invisible.** `Card.legalities` is already fetched from Scryfall, normalized, and cached in Dexie (`lib/scryfall/normalize.ts` → `mapLegalities`), but nothing in the card detail UI renders it. Users cannot tell that a card is banned in Commander until deck-level validation flags it — and only for the Commander format.
2. **Mana is unreadable.** `components/cards/card-metadata.tsx` and `components/cards/card-result-row.tsx` print the raw Scryfall string `{2}{W}{U}` in monospace. Symbols must be rendered as actual MTG pips.
3. **Search is name-only.** `lib/hooks/use-card-search.ts` passes the query verbatim to Scryfall with `unique=cards`. There is no way to narrow by color, type, rarity, mana value, set, or legality, which makes finding a specific card slow on a phone.

The phase also introduces a small amount of new infrastructure — a **symbology cache** and a **search filter model** — that later phases (deck browsing, wishlist) can reuse.

## Goal

1. Convert the card detail sheet into a tabbed surface: **Overview / Legality / Price** (plus **Rulings** as an optional stretch).
2. Render a complete legality matrix for every format Scryfall reports, not just the eight `DeckFormat` values.
3. Warn on add when the card is not legal in the target deck's format, with an explicit confirmation step.
4. Build a `ManaSymbol` / `ManaCost` component backed by a cached Scryfall symbology table.
5. Replace every raw mana-cost and color-letter rendering across the app.
6. Add a faceted filter sheet to card search, with online (Scryfall query) and offline (Dexie) implementations.
7. Persist the user's last-used filters and surface active filters as removable chips.

## Prerequisites

- **Phase 3** — Dexie database, repositories, migration pattern (new table requires a schema version bump).
- **Phase 4** — Scryfall client, `normalizeScryfallCard`, proxy route, offline fallback.
- **Phase 5** — `useAddCard` mutation and `AddCardResult.warnings`.
- **Phase 9** — Card image / display density behaviour (filters must respect density).
- **Phase 13** — `DeckWarning` model and `lib/deck-rules/` (legality warning wording should stay consistent).
- **Phase 16** — Production baseline; changes ship as v1.1.0.

## Dependencies on Previous Phases

| Phase | Dependency                                                            |
| ----- | --------------------------------------------------------------------- |
| 3     | Dexie schema versioning for the new `symbols` table                   |
| 4     | `lib/scryfall/client.ts`, `endpoints.ts`, `normalize.ts`, proxy route |
| 5     | `useAddCard` warning channel for the banned-card confirmation         |
| 9     | Density modes; symbols must render in compact rows                    |
| 13    | `DeckWarning` severity vocabulary reused for legality messaging       |
| 16    | Production release process; this ships as a tagged v1.1.0             |

## Duration Estimate

**5–7 days** for a single developer.

| Sub-area                                    | Estimate |
| ------------------------------------------- | -------- |
| Legality data model + normalize widening    | 0.5 day  |
| Tabs primitive + card detail restructure    | 1 day    |
| Legality tab UI + deck-format warning flow  | 1 day    |
| Symbology fetch, cache, SW precache         | 1 day    |
| ManaSymbol / ManaCost components + rollout  | 1 day    |
| Search filter model + Scryfall query build  | 1 day    |
| Filter sheet UI + offline filtering         | 1 day    |
| Unit / integration / E2E tests              | 1 day    |

## Architecture & Key Decisions

### 17.A — Legality is wider than `DeckFormat`

**Problem:** `types/index.ts` defines `DeckFormat` as eight values (`commander`, `standard`, `modern`, `pioneer`, `legacy`, `vintage`, `pauper`, `other`). Scryfall returns ~20 formats (`brawl`, `standardbrawl`, `alchemy`, `historic`, `timeless`, `explorer`, `oathbreaker`, `duel`, `predh`, `premodern`, `oldschool`, `penny`, `future`, `gladiator`, …). `mapLegalities()` currently casts every Scryfall key to `DeckFormat`, which is a lie the type system cannot catch — `out["brawl" as DeckFormat]` is stored but unrepresentable.

**Decision:** Introduce a dedicated `LegalityFormat` union that is a **superset** of `DeckFormat`, and retype `Card.legalities` as `Partial<Record<LegalityFormat, CardLegality>>`. `DeckFormat` stays the deck-building format list; `LegalityFormat` is display-only.

```ts
// types/card.ts
export type LegalityFormat =
  | "standard" | "future" | "historic" | "timeless" | "gladiator"
  | "pioneer" | "explorer" | "modern" | "legacy" | "pauper"
  | "vintage" | "penny" | "commander" | "oathbreaker" | "standardbrawl"
  | "brawl" | "alchemy" | "paupercommander" | "duel" | "oldschool"
  | "premodern" | "predh";

export interface Card {
  legalities?: Partial<Record<LegalityFormat, CardLegality>>;
}
```

`mapLegalities()` keeps unknown keys out of the record but must **no longer drop** formats simply because they are not deck formats. Add a `KNOWN_LEGALITY_FORMATS` set and a `DISPLAY_LEGALITY_FORMATS` ordered array (the subset and order shown in the UI).

**Migration:** none required — existing cached cards already contain the extra keys at runtime; only the type widens. No Dexie version bump for this change.

### 17.B — Tabbed card detail

**Decision:** Add a real shadcn/ui `Tabs` primitive (`components/ui/tabs.tsx`, Radix `@radix-ui/react-tabs`) rather than growing the existing button-based `card-face-tabs.tsx`.

Tab layout in `card-detail-sheet.tsx`:

| Tab          | Contents                                                                 |
| ------------ | ------------------------------------------------------------------------ |
| **Overview** | Image, face switcher, `CardMetadata`, colors/identity pips, add-to-deck  |
| **Legality** | Format legality matrix + deck-format callout                            |
| **Price**    | `CardPriceDisplay`, TCGplayer link, refresh button                       |
| **Rulings**  | *(stretch)* Scryfall rulings list, cached, offline-tolerant              |

Rules:
- Tabs are **presentation only** — do not move `useAddCard` state into a tab component; keep the deck/zone/status/qty controls mounted so switching tabs never loses input.
- The footer action bar (Scryfall / Add to Deck / Mark as Consider / Add to Wishlist) stays outside the tabs, always visible.
- `card-face-tabs.tsx` stays as-is for multi-face switching (it is a different axis); do not nest it inside `Tabs`.
- Default tab is `overview`. Tab state resets when `card.id` changes.
- Preserve every existing `data-testid` so Phase 15/16 E2E tests keep passing.

### 17.C — Banned-card add warning

**Decision:** **Warn, never block.** The user owns their decks and may be building a proxy/kitchen-table list.

Flow when the user taps "Add to Deck" / "Mark as Consider":

```text
1. Resolve target deck → deck.format
2. legality = card.legalities?.[deck.format]   (deck.format "other" → skip entirely)
3. legality is "legal" or undefined → add immediately (unchanged behaviour)
4. legality is "banned" | "restricted" | "not_legal"
     → open confirmation dialog
     → "Add anyway" proceeds; "Cancel" aborts
5. After a confirmed add, the toast is a warning toast, not a success toast
```

Copy:

| Legality     | Message                                                                    |
| ------------ | -------------------------------------------------------------------------- |
| `banned`     | "{Card} is **banned** in {Format}. Add it anyway?"                          |
| `restricted` | "{Card} is **restricted** in {Format} — max 1 copy. Add it anyway?"         |
| `not_legal`  | "{Card} is **not legal** in {Format} (not in the card pool). Add it anyway?" |

Additional surfaces:
- A persistent inline callout in the add-to-deck block whenever the selected deck's format flags the card — visible **before** the user commits.
- A small `Badge` on the deck row / card row for cards already in a deck that are illegal in that deck's format.
- Reuse the existing `DeckWarning` category vocabulary from Phase 13 so wording matches the deck check panel.

**Offline behaviour:** if `card.legalities` is undefined (card never fully fetched), skip the warning silently. Do not claim legality is unknown in a modal.

### 17.D — Mana & color symbols

**Decision:** Source symbols from Scryfall's `/symbology` endpoint and cache them, rather than bundling a third-party icon font.

Why: Scryfall is already the data source and its symbology payload is authoritative and self-updating (new sets add new symbols). Bundling `mana-font` would drift and adds ~80 KB.

```text
GET https://api.scryfall.com/symbology
→ [{ symbol: "{W}", svg_uri, english, represents_mana, cmc, colors, ... }]
```

Implementation:

1. **Dexie table `symbols`** (schema version bump, follow `lib/db/migrations/` conventions):
   `symbol` (primary key, e.g. `{W}`), `svgUri`, `english`, `representsMana`, `colors`, `updatedAt`.
2. **`lib/scryfall/symbology.ts`** — `fetchSymbology()`, and `ensureSymbologyCached()` which refreshes when the cache is empty or older than 30 days. Call it once on app boot (client provider), never per-render.
3. **`lib/mana/parse-mana-cost.ts`** — pure function splitting `{2}{W/U}{X}` into ordered tokens. Must handle hybrid (`{W/U}`), Phyrexian (`{W/P}`), 2-generic hybrid (`{2/W}`), `{X}`/`{Y}`/`{Z}`, snow `{S}`, colorless `{C}`, tap/untap `{T}`/`{Q}`, and half/infinity edge cases. Unknown tokens fall back to their literal text.
4. **`components/cards/mana-symbol.tsx`** — single symbol; `<img>` with the cached `svgUri`, `alt` = the symbol's `english` text, decorative sizing via `size` prop (`sm` | `md` | `lg`).
5. **`components/cards/mana-cost.tsx`** — parses a cost string and renders a row of `ManaSymbol`s with an accessible label (`aria-label="two generic, white, blue"`), so screen readers do not read twenty images.
6. **`components/cards/color-identity-pips.tsx`** — renders `Card.colors` / `Card.colorIdentity` as `W U B R G C` pips. Replaces the "MANA COLOR" text row in `CardMetadata`.

**Offline / degradation ladder:**

```text
cached SVG in Dexie + SW cache  →  render <img>
symbol known but SVG not cached →  render themed letter pip (CSS circle)
symbol unknown                  →  render raw token text {2}
symbology never fetched         →  render raw cost string (today's behaviour)
```

Add the symbology SVG origin (`https://svgs.scryfall.io/`) to the service worker runtime cache with a long-lived `CacheFirst` strategy — symbols are immutable.

**Do not** apply symbol rendering to oracle text in this phase (inline symbol substitution in rules text is a bigger job); log it as out of scope.

### 17.E — Search filters

**Decision:** A single `CardSearchFilters` object drives both the online Scryfall query and the offline Dexie filter, so results are consistent in both modes.

```ts
// lib/cards/search-filters.ts
export type CardSearchFilters = {
  colors?: string[];            // W U B R G C
  colorMode?: "exact" | "including" | "atMost";
  colorIdentity?: string[];     // commander-friendly: id<=WU
  types?: string[];             // creature, instant, artifact, land, …
  rarities?: string[];          // common, uncommon, rare, mythic
  manaValueMin?: number;
  manaValueMax?: number;
  setCode?: string;
  legalIn?: DeckFormat;         // "legal in commander"
};
```

**Online:** `buildScryfallQuery(text, filters)` composes Scryfall search syntax and appends it to the user's text:

| Filter                          | Scryfall fragment      |
| ------------------------------- | ---------------------- |
| colors, mode `including`        | `c>=wu`                |
| colors, mode `exact`            | `c=wu`                 |
| colors, mode `atMost`           | `c<=wu`                |
| colorIdentity                   | `id<=wu`               |
| types                           | `(t:creature or t:artifact)` |
| rarities                        | `(r:rare or r:mythic)` |
| manaValueMin / Max              | `cmc>=2 cmc<=4`        |
| setCode                         | `set:neo`              |
| legalIn                         | `legal:commander`      |

The raw text is quoted/escaped so a user typing `t:creature` themselves still works — append filter fragments, never rewrite the user's text.

**Offline:** `applyLocalFilters(cards, filters)` runs the same predicates against Dexie results from `CardRepository.searchLocal()`. Show the existing offline banner plus a note that filtering is limited to cached cards.

**Empty query + filters:** allow searching with filters only (e.g. "all red rares in NEO") by lowering the current 2-character minimum when any filter is active.

**UI:**
- A **Filters** button next to `card-search-input.tsx` showing an active-filter count badge.
- Filters open in a bottom `Sheet` (mobile-first), with a sticky "Apply" / "Clear all" footer.
- Applied filters render as removable **chips** above the results.
- Persist last-used filters in the app settings table (`searchFilters`), so the sheet reopens where the user left it. Clearing is always one tap away.

**Performance:** debounce filter changes through the same 300 ms path as text; do not fire a Scryfall request per checkbox tap.

## Data Model Impact

### Type changes (`types/card.ts`)

```ts
export type LegalityFormat = /* see 17.A */;
export interface Card {
  legalities?: Partial<Record<LegalityFormat, CardLegality>>;
}
export interface MtgSymbol {
  symbol: string;          // "{W}"
  svgUri: string;
  english: string;
  representsMana: boolean;
  colors: string[];
  updatedAt: string;
}
```

### Dexie schema (version bump)

```ts
// lib/db/database.ts — next version
this.version(N).stores({
  // …existing tables unchanged…
  symbols: "symbol, updatedAt",
});
```

- No data migration needed; the table is a rebuildable cache.
- `symbols` must be **excluded from export/import** (Phase 10 backups) — it is derived data, not user data. Verify `AppBackup` shape is untouched.

### Settings

Add `searchFilters: CardSearchFilters | null` to `AppSettings` / `DEFAULT_APP_SETTINGS` / `SETTING_KEYS` in `types/card.ts` (default `null`).

## Routes / Screens

No new routes. Modified screens:

```text
/cards                    — filter button, filter sheet, filter chips
/cards/[cardId]           — tabs incl. Legality; mana symbols
/decks/[deckId]/cards     — mana symbols in rows; illegal-card badge
```

## File Structure (files to create/modify)

### Create

```text
components/ui/tabs.tsx                          — shadcn Tabs (Radix)
components/cards/card-legality-panel.tsx        — format legality matrix
components/cards/card-legality-badge.tsx        — single legality pill
components/cards/mana-symbol.tsx                — one symbol
components/cards/mana-cost.tsx                  — parsed cost row
components/cards/color-identity-pips.tsx        — W/U/B/R/G/C pips
components/cards/card-search-filters-sheet.tsx  — filter bottom sheet
components/cards/card-search-filter-chips.tsx   — active filter chips
components/cards/illegal-card-dialog.tsx        — add-anyway confirmation
lib/scryfall/symbology.ts                       — fetch + cache symbology
lib/db/repositories/symbol-repository.ts        — Dexie access for symbols
lib/mana/parse-mana-cost.ts                     — cost string tokenizer
lib/cards/legality.ts                           — format labels, ordering, helpers
lib/cards/search-filters.ts                     — filter type + query builder + local predicates
lib/hooks/use-symbology.ts                      — boot-time symbology hydration
lib/hooks/use-search-filters.ts                 — filter state + settings persistence
tests/unit/mana/parse-mana-cost.test.ts
tests/unit/cards/search-filters.test.ts
tests/unit/cards/legality.test.ts
tests/integration/symbology-cache.test.ts
tests/e2e/search-filters.test.ts
```

### Modify

```text
types/card.ts                       — LegalityFormat, MtgSymbol, searchFilters setting
types/index.ts                      — re-export new types
lib/scryfall/normalize.ts           — widen mapLegalities to all known formats
lib/scryfall/endpoints.ts           — symbologyUrl()
lib/db/database.ts                  — symbols table, version bump
lib/hooks/use-card-search.ts        — accept filters, build query, local filtering
components/cards/cards-page-client.tsx    — filter state wiring
components/cards/card-search-input.tsx    — filter button + count badge
components/cards/card-detail-sheet.tsx    — tabs restructure + add warning
components/cards/card-metadata.tsx        — ManaCost + color pips
components/cards/card-result-row.tsx      — ManaCost in results
components/deck/deck-card-row.tsx         — ManaCost + illegal badge
app/cards/[cardId]/page.tsx               — tabs on the standalone detail route
app/api/cards/search/route.ts             — pass through filter params if proxied
public/sw.js (or SW config)               — cache svgs.scryfall.io
docs/data-model.md                        — symbols table, LegalityFormat
README.md                                 — feature list update
```

## Detailed Task List

### 17.1 — Legality data model

- [ ] Add `LegalityFormat` union to `types/card.ts` covering all Scryfall formats
- [ ] Retype `Card.legalities` to `Partial<Record<LegalityFormat, CardLegality>>`
- [ ] Add `KNOWN_LEGALITY_FORMATS` set and `DISPLAY_LEGALITY_FORMATS` ordered list in `lib/cards/legality.ts`
- [ ] Add `FORMAT_LABELS` map (`standardbrawl` → "Standard Brawl", `predh` → "PreDH")
- [ ] Update `mapLegalities()` in `lib/scryfall/normalize.ts` to retain all known formats
- [ ] Verify `lib/deck-rules/commander-rules.ts` still compiles (it reads `legalities.commander`)
- [ ] Add `isPlayableIn(card, format)` and `getLegalityWarning(card, format)` helpers
- [ ] Unit tests: unknown format keys dropped, all known formats retained, `other` format short-circuits

### 17.2 — Tabs primitive

- [ ] Install Radix tabs (`npx shadcn@latest add tabs`) and confirm Neo Brutalism styling (zero radius, 2px borders, offset shadow on active tab)
- [ ] Ensure tab triggers are >= 44px tall for touch
- [ ] Keyboard: arrow-key navigation works; focus ring visible
- [ ] Verify Knip does not flag the new file as unused

### 17.3 — Card detail tabs

- [ ] Restructure `card-detail-sheet.tsx` into Overview / Legality / Price tabs
- [ ] Keep image, face tabs, and footer actions outside the tab panels
- [ ] Keep add-to-deck controls mounted (state must survive tab switches)
- [ ] Reset active tab to `overview` when `card.id` changes
- [ ] Preserve all existing `data-testid` attributes
- [ ] Add `data-testid="card-detail-tab-legality"` etc. for new triggers
- [ ] Mirror the same tab structure on `app/cards/[cardId]/page.tsx`
- [ ] Verify sheet scroll behaviour on iPhone (each panel scrolls, header does not jump)

### 17.4 — Legality panel

- [ ] Build `card-legality-badge.tsx`: `legal` (positive), `not_legal` (muted), `banned` (destructive), `restricted` (warning)
- [ ] Build `card-legality-panel.tsx`: two-column grid of format → badge, ordered by `DISPLAY_LEGALITY_FORMATS`
- [ ] Pin the target deck's format to the top with a highlighted row
- [ ] Empty state when `legalities` is undefined: "Legality data not cached — connect to refresh"
- [ ] Add a refresh action that re-fetches the card from Scryfall when online
- [ ] Color-blind safety: never rely on color alone — always show the word (LEGAL / BANNED / …)

### 17.5 — Banned-card add warning

- [ ] Build `illegal-card-dialog.tsx` (Radix Dialog or reuse Sheet) with "Add anyway" / "Cancel"
- [ ] Intercept `handleAdd()` in `card-detail-sheet.tsx`: check legality against the selected deck's format before mutating
- [ ] Skip the check when deck format is `other` or legality is unknown
- [ ] Show a persistent inline callout in the add-to-deck block when the selected deck flags the card
- [ ] Re-evaluate the callout when the user changes the target deck
- [ ] Use `toast.warning` (not success) after a confirmed illegal add
- [ ] Add an illegal badge to `deck-card-row.tsx` for cards already in a deck
- [ ] Ensure wording matches Phase 13 deck-check warnings
- [ ] Unit tests for `getLegalityWarning` across all four legality values and all deck formats

### 17.6 — Symbology fetch & cache

- [ ] Add `symbologyUrl()` to `lib/scryfall/endpoints.ts`
- [ ] Implement `fetchSymbology()` in `lib/scryfall/symbology.ts` with the existing client's rate limiting and User-Agent
- [ ] Add `symbols` table to `lib/db/database.ts` with a version bump; document in `lib/db/migrations/README.md`
- [ ] Implement `symbol-repository.ts` (`bulkUpsert`, `getAll`, `getBySymbol`, `isStale`)
- [ ] Implement `ensureSymbologyCached()` — refresh when empty or > 30 days old
- [ ] Hydrate once at app boot via `use-symbology.ts`; never per-component
- [ ] Fail silently when offline — the degradation ladder covers it
- [ ] Exclude `symbols` from backup export/import (Phase 10) and verify the round-trip test still passes
- [ ] Integration test: fetch → cache → offline read

### 17.7 — Mana symbol components

- [ ] Implement `parse-mana-cost.ts` handling generic, colored, hybrid, 2-generic hybrid, Phyrexian, `{X}`, `{S}`, `{C}`, `{T}`, `{Q}`, and unknown tokens
- [ ] Implement `mana-symbol.tsx` with `size` prop and cached-SVG lookup
- [ ] Implement `mana-cost.tsx` with a single accessible `aria-label` for the whole cost
- [ ] Implement `color-identity-pips.tsx` for `colors` / `colorIdentity`
- [ ] CSS fallback pips themed per color (W U B R G C) for the uncached case
- [ ] Add symbol SVG origin to the service worker runtime cache (`CacheFirst`)
- [ ] Verify `next.config.ts` image handling — plain `<img>` is fine for SVG; do not route through `next/image`
- [ ] Unit tests for the tokenizer covering every symbol class above

### 17.8 — Symbol rollout

- [ ] `card-metadata.tsx` — replace raw `manaCost` with `<ManaCost>`; add color / color identity pip rows
- [ ] `card-result-row.tsx` — `<ManaCost size="sm">` in results
- [ ] `deck-card-row.tsx` — `<ManaCost size="sm">`; keep `MV` numeric badge
- [ ] `deck-color-chart.tsx` — use pips in the legend for consistency
- [ ] Compact density: symbols must not increase row height beyond current spec
- [ ] Verify no layout shift on slow symbol loads (fixed dimensions on the `<img>`)

### 17.9 — Search filter model

- [ ] Define `CardSearchFilters` in `lib/cards/search-filters.ts`
- [ ] Implement `buildScryfallQuery(text, filters)` with the fragment table from 17.E
- [ ] Escape/quote user text so hand-typed Scryfall syntax still works
- [ ] Implement `applyLocalFilters(cards, filters)` mirroring each predicate
- [ ] Implement `countActiveFilters(filters)` and `clearFilters()`
- [ ] Unit tests: each filter fragment, combinations, empty filters produce the original query, local and remote predicates agree on a fixture set

### 17.10 — Search filter UI

- [ ] Add a **Filters** button with active-count badge to `card-search-input.tsx`
- [ ] Build `card-search-filters-sheet.tsx`: color toggles + mode selector, type multi-select, rarity toggles, mana value min/max, set input, "legal in" format select
- [ ] Sticky footer with "Apply" and "Clear all"
- [ ] Build `card-search-filter-chips.tsx` with per-chip removal
- [ ] Wire state in `cards-page-client.tsx`; pass filters into `use-card-search.ts`
- [ ] Include filters in the React Query key so results cache correctly
- [ ] Allow a filters-only search (relax the 2-character minimum when filters are active)
- [ ] Persist filters to the settings table via `use-search-filters.ts`
- [ ] Offline mode: apply local filters and explain the cached-only limitation in the existing banner
- [ ] Empty result state: "No cards match — try clearing filters" with a clear-all action

### 17.11 — Documentation

- [ ] Update `docs/data-model.md` — `symbols` table, `LegalityFormat`, `searchFilters` setting
- [ ] Update `README.md` feature list
- [ ] Add a `docs/decisions.md` entry for symbology-over-icon-font and warn-not-block
- [ ] Update `build-plan/README.md` phase index and dependency graph

## Implementation Notes

### Scryfall symbology response shape

```json
{
  "object": "list",
  "data": [
    {
      "object": "card_symbol",
      "symbol": "{W}",
      "svg_uri": "https://svgs.scryfall.io/card-symbols/W.svg",
      "english": "one white mana",
      "represents_mana": true,
      "cmc": 1.0,
      "colors": ["W"]
    }
  ]
}
```

Reference: [Scryfall Card Symbols](https://scryfall.com/docs/api/card-symbols) and [Colors and Mana Costs](https://scryfall.com/docs/api/colors).

Symbology is a **single unpaginated request** (~80 symbols). Fetch it once, not per card.

### Mana cost tokenizer contract

```ts
parseManaCost("{2}{W/U}{X}")
// → [{ raw: "{2}" }, { raw: "{W/U}" }, { raw: "{X}" }]
parseManaCost("") // → []
parseManaCost(undefined) // → []
parseManaCost("garbage") // → [{ raw: "garbage", unknown: true }]
```

Keep the tokenizer pure and dependency-free so it is trivially testable and reusable by future oracle-text rendering.

### Accessibility for symbol rows

Do **not** give each `<img>` a meaningful `alt` inside a cost — twenty images means twenty announcements. Mark individual symbols `alt=""` / `aria-hidden` and put one label on the container:

```tsx
<span role="img" aria-label="two generic, white or blue, X">
  {tokens.map(...)}
</span>
```

### Scryfall query composition example

```ts
buildScryfallQuery("bolt", {
  colors: ["R"], colorMode: "including",
  types: ["instant"], rarities: ["common"],
  manaValueMax: 1, legalIn: "commander",
});
// → 'bolt c>=r (t:instant) (r:common) cmc<=1 legal:commander'
```

### Legality check placement

Put the check in the mutation call site (`card-detail-sheet.tsx`), **not** inside `useAddCard`. The hook is used by import and bulk paths that must not open dialogs. If a shared guard is wanted later, expose it as a pure helper from `lib/cards/legality.ts`.

### Do not regress E2E

`tests/e2e/upgrade-workflow.test.ts` and friends drive the card detail sheet by `data-testid`. Tab restructuring must keep those IDs on the same interactive elements. If a control moves into a non-default tab, the E2E test must click that tab first — update the test, do not rename the ID.

## Automation & Quality Gates

Reference: [`automation-strategy.md`](./automation-strategy.md).

- [ ] `npm run lint` clean
- [ ] `npm run typecheck` clean (the `LegalityFormat` widening will surface real errors — fix, do not cast)
- [ ] `npm run test:unit` — new tests for tokenizer, filters, legality helpers
- [ ] `npm run test:e2e` — existing suites green plus the new filter test
- [ ] Knip clean (no unused new exports; every created file must be reachable)
- [ ] Bundle size: symbology adds no bundled assets — verify no icon font sneaks in
- [ ] Lighthouse accessibility score not regressed by symbol images

## Testing Checklist

### Unit

- [ ] `parseManaCost` — generic, colored, hybrid, 2-generic hybrid, Phyrexian, X, snow, colorless, tap, unknown, empty, undefined
- [ ] `mapLegalities` — retains all known formats, drops unknown keys and unknown values
- [ ] `getLegalityWarning` — legal / not_legal / banned / restricted / undefined / format `other`
- [ ] `buildScryfallQuery` — each filter individually, combined, empty
- [ ] `applyLocalFilters` — parity with the remote fragments on a fixture set
- [ ] `countActiveFilters` — zero, partial, all

### Integration

- [ ] Symbology fetch → Dexie cache → offline read returns symbols
- [ ] Stale symbology (> 30 days) triggers refresh when online
- [ ] Card search with filters caches results under a filter-specific query key
- [ ] Backup export excludes `symbols`; import into a fresh DB still works

### E2E (TestCafe)

- [ ] Open card detail → switch to Legality tab → matrix visible
- [ ] Add a Commander-banned card to a Commander deck → dialog appears → cancel → card not added
- [ ] Repeat → "Add anyway" → card added with a warning toast
- [ ] Search "dragon" → filter to red + rare → result count drops → chips visible → clear all restores
- [ ] Filters persist across a page reload

### Manual (iPhone Safari, installed PWA)

- [ ] Tabs are tappable and do not trigger sheet-drag gestures
- [ ] Mana symbols render crisply on retina and are legible at compact density
- [ ] Filter sheet is usable one-handed; footer clears the home indicator
- [ ] Airplane mode: symbols still render from cache; filters still narrow cached results
- [ ] Legality tab on a card that was never opened online shows the graceful empty state

## Exit Criteria

- [x] Card detail (sheet and route) is tabbed with a working Legality tab
- [x] Every Scryfall-reported format is shown with a correct, color-blind-safe badge
- [x] Adding a banned / restricted / not-legal card to a deck of that format prompts a confirmation and can be overridden
- [x] Cards illegal in their deck's format are badged in deck lists
- [x] Mana costs render as real symbols everywhere a cost was previously raw text
- [x] Color and color identity render as pips in card detail
- [x] Symbols work offline from cache and degrade gracefully when uncached
- [x] Card search supports color, color identity, type, rarity, mana value, set, and format-legality filters
- [x] Filters work online (Scryfall syntax) and offline (local Dexie)
- [x] Active filters are visible as removable chips and persist across sessions
- [x] All new logic is unit tested; CI is fully green (`npm run verify`)
- [x] `docs/data-model.md` and `README.md` updated
- [x] Released as `v1.1.0` with a CHANGELOG entry (in-repo; git tag is human)

## Risks & Mitigations

| Risk                                            | Impact                              | Mitigation                                                        |
| ----------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------- |
| `LegalityFormat` widening breaks existing types | Compile errors across deck-rules    | Superset union keeps `DeckFormat` keys valid; fix errors, no casts |
| Symbol images cause layout shift                | Janky lists on scroll               | Fixed width/height on every symbol `<img>`                        |
| Symbology fetch on every boot                   | Wasted Scryfall requests            | 30-day staleness check; single hydration hook                     |
| Symbols unavailable offline on first run        | Raw `{W}` text shown                | Documented degradation ladder; SW precache after first fetch       |
| Filter chips consume vertical space on iPhone   | Fewer results visible               | Single scrollable chip row; collapse when > 4                     |
| Scryfall query syntax conflicts with user text  | Zero results for valid searches     | Append fragments only; never rewrite user text; unit test parity   |
| Confirmation dialog feels obstructive           | User annoyance on intentional adds  | Warn only for the selected deck's format; never for format `other` |
| Tab restructure breaks Phase 15 E2E             | Red CI                              | Preserve `data-testid`s; update tests to click tabs where needed   |
| Offline filters differ from online results      | Confusing UX                        | Shared predicate tests; explicit "cached cards only" messaging     |

## Out of Scope

- Inline symbol rendering inside oracle text (deferred to a later phase)
- Rulings tab (stretch only — ship without it if time is short)
- Full non-Commander format **deck validation** (Phase 13 still owns rules; this phase only *displays* legality)
- Banned-list snapshots or historical legality tracking
- Saved / named search presets
- Advanced Scryfall operators in the filter UI (power/toughness, oracle text, artist, price)
- Sorting controls in search results
- Set symbol / rarity-colored set icons
- Bulk legality audit across all decks
- Server-side filter caching

## Handoff to Next Phase

The next formal phase is
[`phase-18-solar-dusk-theme.md`](./phase-18-solar-dusk-theme.md). Complete and
release Phase 17 first so Phase 18 can migrate the tabs, legality badges, filter
sheet/chips, and mana-symbol fallbacks as part of one complete visual-system
audit. Phase 17 remains governed by the launch-era Neo Brutalism decision;
Phase 18 supersedes that decision after these features are stable.

Phase 17 leaves three reusable pieces for future work:

1. **`lib/cards/legality.ts`** — format labels and helpers, ready for a per-deck legality audit screen.
2. **Symbology cache + tokenizer** — the foundation for inline oracle-text symbol rendering.
3. **`CardSearchFilters`** — reusable for wishlist filtering and deck-list filtering.

Suggested follow-ups (not yet formal phases):

- Inline symbols in oracle text and deck notes
- Saved search presets and sort controls
- Legality audit panel: "12 cards illegal in this deck's format"
- Extend Phase 13 `FormatRules` with real Modern / Pauper validators now that full legality data is typed
