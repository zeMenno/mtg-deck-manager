# Phase 13 — Format & Deck Validation

## Agent Handoff Prompt

```
You are implementing Phase 13 (Format & Deck Validation) of the MTG Deck Builder PWA.

Workspace: mtg-deck-manager
Read first:
- build-plan/phase-13-format-deck-validation.md (this document — follow every section)
- build-plan/README.md (context and dependencies)
- plans/mtg-deck-builder-web-app-build-plan.md (master reference, sections 16, 17, 35)

Prerequisites: Phases 0–12 complete (especially Phase 5 deck management, Phase 6 dashboard/warnings stub, Phase 7 projected deck, Phase 12 wishlist promotion).

Goal: Implement a pluggable FormatRules system with Commander validation (count, 100 cards, duplicates, color identity), and surface warnings in three distinct categories: LEGALITY, RECOMMENDATION, and WARNING. Recommendations must be configurable in settings.

Deliverables:
1. FormatRules interface and CommanderRules implementation
2. DeckWarning type with category, severity, message, and optional fix action
3. Deck validation service invoked on dashboard, projected deck, and apply-changes preview
4. Deck Check panel UI on deck dashboard and stats screens
5. Configurable recommendation thresholds in settings (land count, ramp, draw, removal targets)
6. Clear visual distinction between hard legality errors and soft recommendations
7. Unit tests for all Commander validation rules

Constraints:
- Do NOT build a full MTG rules engine — Commander MVP rules only
- Do NOT label recommendations as legality errors
- Use Scryfall legality data when available; degrade gracefully when offline
- Validation must work on projected deck (CURRENT + ADD - CUT)
- Performance: validate 100-card deck in <50ms on device

When done, verify exit criteria and ensure projected deck view shows validation state.
```

## Overview

Phase 13 adds **intelligent deck validation** — the app's ability to catch common Commander deck-building mistakes before the user buys cards or applies changes. This is not a comprehensive MTG rules engine; it is a **practical guardrail layer** that separates:

- **LEGALITY** — hard format violations (wrong card count, illegal commander, off-color card)
- **RECOMMENDATION** — configurable heuristics (recommended land count, ramp targets)
- **WARNING** — informational notices (low removal count, high curve)

The validation system is architected behind a `FormatRules` interface so future formats (Standard, Pauper) can be added without rewriting UI components.

Validation runs against both the **current deck** and the **projected deck** (CURRENT + ADD − CUT), giving users confidence before committing upgrades.

## Goal

1. Define a extensible `FormatRules` interface and `DeckWarning` model.
2. Implement `CommanderRules` with MVP Commander checks.
3. Surface validation results in a "Deck Check" panel on dashboard and stats.
4. Show projected deck violations before "Apply Changes".
5. Allow users to configure recommendation thresholds in Settings.
6. Use Scryfall legality fields when card metadata includes them.
7. Achieve clear UX separation between "illegal" and "you might want more lands".

## Prerequisites

- **Phase 5** — Deck with `format`, `commanderId`, `DeckCard` zones and quantities.
- **Phase 6** — Deck dashboard exists; may have stub warnings widget.
- **Phase 7** — Projected deck calculation (CURRENT + ADD − CUT).
- **Phase 4** — Card `colorIdentity`, `typeLine`, Scryfall legality in cached metadata.
- **Phase 3** — Settings storage for configurable thresholds.

## Dependencies on Previous Phases

| Phase | Dependency                                                  |
| ----- | ----------------------------------------------------------- |
| 3     | Settings table for recommendation config                    |
| 4     | Card colorIdentity, typeLine, legalities from Scryfall      |
| 5     | Deck.format, commanderId, deckCards with zones              |
| 6     | Dashboard layout for Deck Check panel placement             |
| 7     | Projected deck composition for pre-apply validation         |
| 12    | Cards promoted from wishlist appear in projected validation |

## Duration Estimate

**4–6 days** for a single developer.

| Sub-area                                  | Estimate |
| ----------------------------------------- | -------- |
| Types + FormatRules interface             | 0.5 day  |
| CommanderRules implementation             | 1.5 days |
| Recommendation config + settings UI       | 1 day    |
| Deck Check UI components                  | 1 day    |
| Integration (dashboard, projected, apply) | 1 day    |
| Unit tests + edge cases                   | 1 day    |

## Architecture & Key Decisions

### Pluggable FormatRules

**Decision:** Single interface; format selected by `deck.format`:

```ts
interface FormatRules {
  format: DeckFormat;
  getDeckWarnings(
    deck: Deck,
    cards: DeckCard[],
    cardLookup: CardLookup,
  ): DeckWarning[];
  getProjectedWarnings(
    deck: Deck,
    projected: ProjectedDeck,
    cardLookup: CardLookup,
  ): DeckWarning[];
}
```

Factory: `getFormatRules(format: DeckFormat): FormatRules`

MVP implements only `CommanderRules`. Other formats return empty warnings or a single "validation not available" info notice.

### Three warning categories

**Decision:** Strict semantic separation:

| Category         | Meaning                     | UI treatment                                     |
| ---------------- | --------------------------- | ------------------------------------------------ |
| `LEGALITY`       | Violates format rules       | Red/destructive, blocks "Apply Changes" optional |
| `RECOMMENDATION` | Configurable heuristic miss | Yellow/consider, informational                   |
| `WARNING`        | Soft advisory               | Neutral or blue, informational                   |

Never show a land-count suggestion as LEGALITY.

### Severity levels

```ts
type WarningSeverity = "error" | "warn" | "info" | "success";
```

- `error` — LEGALITY violations only
- `warn` — WARNING category
- `info` — RECOMMENDATION misses (not bad, just below target)
- `success` — passing checks ("✓ 100 cards")

### Commander counting rules

**Decision:** For Commander MVP:

- Total deck size = mainboard cards + commander (commander counts toward 100)
- Commander in `zone: 'commander'` — exactly 1 required
- Mainboard = 99 other cards (100 total including commander)
- Sideboard not used in Commander (warn if present)
- Duplicate rule: only basic lands (`typeLine` contains "Basic Land") may appear >1 copy
- Color identity: union of commander + all mainboard cards' color identity must contain each card's pip colors

### Scryfall legality integration

**Decision:** When `Card.legalities?.commander` is available:

- `'legal'` → pass
- `'not_legal'` → LEGALITY error
- `'banned'` → LEGALITY error
- `'restricted'` → treat as not_legal for Commander
- missing/undefined → skip legality check (offline degradation), optionally WARNING "legality unknown"

Store legality in cached card metadata during Scryfall sync (extend Card type if needed).

### Configurable recommendations

**Decision:** Default thresholds stored in settings:

```ts
interface RecommendationConfig {
  minLands: number; // default 33
  maxLands: number; // default 40
  minRamp: number; // default 8
  minCardDraw: number; // default 8
  minRemoval: number; // default 5
  maxAverageCmc: number; // default 3.5 (optional)
}
```

User can adjust in Settings → Deck Preferences. Validation reads config at runtime.

### Role-based counting

**Decision:** Count ramp/draw/removal by **deck card roles** assigned by user, not automatic type inference. If a card has role "Ramp", it counts toward ramp. This aligns with Phase 5/6 role system.

Fallback: optional type-based heuristics as WARNING only (e.g., "Consider assigning roles for accurate stats") — out of scope for MVP if roles are mandatory for recommendations.

### Performance

**Decision:** Pure functions, no async in validation hot path. Pre-build `Map<cardId, Card>` for O(1) lookup. Target <50ms for 100-card deck on mid-range iPhone.

## Data Model Impact

### New types (`types/deck-validation.ts`)

```ts
export type WarningCategory = "LEGALITY" | "RECOMMENDATION" | "WARNING";
export type WarningSeverity = "error" | "warn" | "info" | "success";

export interface DeckWarning {
  id: string;
  category: WarningCategory;
  severity: WarningSeverity;
  code: string; // e.g. 'COMMANDER_COUNT', 'DUPLICATE_NON_BASIC'
  message: string; // human-readable
  details?: string; // optional expansion
  cardIds?: string[]; // related cards
  field?: string; // e.g. 'landCount', 'commanderId'
  actual?: number;
  expected?: number;
}

export interface ProjectedDeck {
  commander: DeckCard | null;
  mainboard: DeckCard[];
  sideboard: DeckCard[];
  totalCount: number;
  // derived from CURRENT + ADD - CUT
}

export interface RecommendationConfig {
  minLands: number;
  maxLands: number;
  minRamp: number;
  minCardDraw: number;
  minRemoval: number;
  maxAverageCmc?: number;
}
```

### Card type extension

Add to `Card` (if not present):

```ts
legalities?: {
  commander?: 'legal' | 'not_legal' | 'banned' | 'restricted';
  // extend as needed
};
```

### Settings key

```ts
// settings table
{ key: 'recommendationConfig', value: RecommendationConfig }
```

No new Dexie tables required — warnings are computed, not persisted.

## Routes / Screens

| Location                               | Component                            |
| -------------------------------------- | ------------------------------------ |
| `/decks/[deckId]`                      | Deck Check panel on dashboard        |
| `/decks/[deckId]/stats`                | Full Deck Check + detailed breakdown |
| `/decks/[deckId]/changes`              | Pre-apply validation banner          |
| Projected deck view                    | Validation state overlay             |
| `/settings` or `/settings/preferences` | Recommendation threshold editor      |

No new top-level routes required.

## File Structure (files to create/modify)

### Create

```text
types/deck-validation.ts
lib/format/format-rules.ts
lib/format/format-rules-factory.ts
lib/format/commander-rules.ts
lib/format/validators/commander-count.ts
lib/format/validators/deck-size.ts
lib/format/validators/duplicate-detection.ts
lib/format/validators/color-identity.ts
lib/format/validators/card-legality.ts
lib/format/validators/land-count.ts
lib/format/validators/role-coverage.ts
lib/format/validators/average-cmc.ts
lib/format/projected-deck-builder.ts
lib/services/deck-validation-service.ts
lib/services/recommendation-config-service.ts
components/deck/deck-warning-list.tsx
components/deck/deck-check-panel.tsx
components/deck/deck-check-summary.tsx
components/deck/warning-badge.tsx
components/deck/projected-validation-banner.tsx
components/settings/recommendation-settings.tsx
hooks/use-deck-warnings.ts
hooks/use-recommendation-config.ts
```

### Modify

```text
types/card.ts                              — add legalities field
lib/scryfall/normalize-card.ts             — map Scryfall legalities
components/deck/deck-dashboard.tsx           — embed DeckCheckPanel
app/decks/[deckId]/stats/page.tsx          — full validation view
components/changes/apply-changes-dialog.tsx  — block/warn on LEGALITY errors
components/changes/projected-deck.tsx        — show validation summary
lib/services/deck-service.ts                 — expose projected deck builder
```

## Detailed Task List

### 13.1 — Core Types & Interface

- [ ] Create `types/deck-validation.ts` with all types
- [ ] Define `FormatRules` interface in `lib/format/format-rules.ts`
- [ ] Define `CardLookup` type: `(cardId: string) => Card | undefined`
- [ ] Define `DeckValidationContext`:
  - [ ] deck, deckCards, cardLookup, recommendationConfig
  - [ ] mode: 'current' | 'projected'
- [ ] Implement `FormatRulesFactory.get(format)` returning CommanderRules for `'commander'`

### 13.2 — Projected Deck Builder

- [ ] Implement `buildProjectedDeck(deckId)`:
  - [ ] Start with CURRENT mainboard + commander
  - [ ] Add ADD cards (merge quantities if duplicate)
  - [ ] Remove CUT cards (by cardId, respect quantity)
  - [ ] Return `ProjectedDeck` structure
- [ ] Handle edge case: CUT removes entire quantity
- [ ] Handle edge case: ADD same card already CURRENT (quantity bump)
- [ ] Unit tests for projection math

### 13.3 — Commander Validators (LEGALITY)

- [ ] **Commander count** (`commander-count.ts`):
  - [ ] Exactly 1 card in `zone: 'commander'`
  - [ ] 0 commanders → LEGALITY error
  - [ ] 2+ commanders → LEGALITY error (partner support: out of scope MVP, show error)
- [ ] **Deck size** (`deck-size.ts`):
  - [ ] Total = commander + mainboard cards (sum quantities)
  - [ ] Must equal 100 for Commander
  - [ ] Under/over → LEGALITY error with actual/expected counts
- [ ] **Duplicate detection** (`duplicate-detection.ts`):
  - [ ] Group mainboard by `cardId` (or oracleId for different printings?)
  - [ ] **Decision:** use `oracleId` for duplicate detection (same card, different printings = duplicate)
  - [ ] Allow multiples only for basic lands (check typeLine includes "Basic Land")
  - [ ] Non-basic duplicate → LEGALITY error listing card names
- [ ] **Color identity** (`color-identity.ts`):
  - [ ] Compute deck color identity from commander
  - [ ] Each mainboard card's colorIdentity must be subset of deck identity
  - [ ] Off-color cards → LEGALITY error with card list
  - [ ] Colorless cards always legal
- [ ] **Card legality** (`card-legality.ts`):
  - [ ] Check Scryfall `legalities.commander` when available
  - [ ] Banned/not legal → LEGALITY error
  - [ ] Missing legality data → WARNING "Could not verify legality" (not LEGALITY)

### 13.4 — Recommendation Validators

- [ ] **Land count** (`land-count.ts`):
  - [ ] Count cards where typeLine includes "Land"
  - [ ] Below minLands → RECOMMENDATION info
  - [ ] Above maxLands → RECOMMENDATION info
  - [ ] Within range → success check
- [ ] **Role coverage** (`role-coverage.ts`):
  - [ ] Count cards with role "Ramp" (or role id)
  - [ ] Below minRamp → RECOMMENDATION
  - [ ] Same for "Card Draw", "Removal"
  - [ ] Use role tag names from app catalog
- [ ] **Average CMC** (`average-cmc.ts`) — optional:
  - [ ] Compute weighted average mana value (exclude lands)
  - [ ] Above maxAverageCmc → WARNING

### 13.5 — CommanderRules Orchestrator

- [ ] Implement `CommanderRules.getDeckWarnings()`:
  - [ ] Run all validators against current deck
  - [ ] Aggregate warnings, dedupe by code where appropriate
  - [ ] Sort: LEGALITY errors first, then WARNING, RECOMMENDATION, success last
- [ ] Implement `CommanderRules.getProjectedWarnings()`:
  - [ ] Build projected deck
  - [ ] Run same validators against projected composition
  - [ ] Add meta-warning if projection fixes or introduces errors vs. current

### 13.6 — Deck Validation Service

- [ ] `DeckValidationService.validateCurrent(deckId): DeckWarning[]`
- [ ] `DeckValidationService.validateProjected(deckId): DeckWarning[]`
- [ ] `DeckValidationService.hasLegalityErrors(warnings): boolean`
- [ ] `DeckValidationService.getSummary(warnings): { errors, warnings, recommendations, passed }`
- [ ] Cache validation result per deckId with invalidation on deck mutation (TanStack Query or simple memo)

### 13.7 — Recommendation Config

- [ ] Default `RecommendationConfig` constants
- [ ] `RecommendationConfigService.get()` / `.update(partial)`
- [ ] Persist in settings table
- [ ] Settings UI: number inputs with sensible min/max bounds
- [ ] Reset to defaults button

### 13.8 — UI Components

- [ ] **DeckCheckPanel** — compact dashboard widget:
  - [ ] Show top 3 issues + "View all" link
  - [ ] Green checkmark if no errors
  - [ ] Red count badge for LEGALITY errors
- [ ] **DeckWarningList** — full list:
  - [ ] Group by category with headers
  - [ ] Icon per severity (✓, ⚠, ✗)
  - [ ] Expandable details for card lists
  - [ ] Tap card name → card detail sheet
- [ ] **DeckCheckSummary** — stats page header counts
- [ ] **WarningBadge** — inline badge for nav/tabs
- [ ] **ProjectedValidationBanner** — on changes screen:
  - [ ] "Projected deck: 100 cards ✓" or "98 cards — 2 short"
  - [ ] Block apply button if LEGALITY errors (with override? **Decision:** block by default, no override in MVP)

### 13.9 — Integration Points

- [ ] Deck dashboard: render DeckCheckPanel, refresh on deck edit
- [ ] Stats page: full DeckWarningList with current + projected toggle
- [ ] Changes / projected deck: ProjectedValidationBanner
- [ ] Apply Changes dialog: re-validate projected before commit
- [ ] Deck list row: optional warning indicator icon if deck has LEGALITY errors

### 13.10 — Scryfall Legality Sync

- [ ] Extend Scryfall normalizer to include `legalities`
- [ ] Backfill: existing cached cards get legality on next refresh
- [ ] Document offline behavior in UI

### 13.11 — Testing

- [ ] Unit tests per validator (see Testing Checklist)
- [ ] Integration: edit deck → warnings update live
- [ ] Integration: ADD/CUT changes → projected warnings update

## Implementation Notes

### Duplicate detection — oracleId vs cardId

Use `oracleId` (Scryfall oracle ID) for "same card" detection. Two different printings of Sol Ring count as duplicates. Basic lands identified by type line, not name (covers Snow-Covered Island etc. as non-basic).

### Color identity algorithm

```ts
function getDeckColorIdentity(commander: Card): string[] {
  return commander.colorIdentity; // WUBRG order
}

function isWithinIdentity(card: Card, deckIdentity: string[]): boolean {
  return card.colorIdentity.every((c) => deckIdentity.includes(c));
}
```

### Success messages

Include positive feedback to reduce alarm fatigue:

```text
✓ 100 cards
✓ Commander set
✓ No duplicate non-basics
✓ Color identity valid
```

### Projected deck validation UX

When user has 98 CURRENT + 3 ADD + 1 CUT = 100 projected:

```text
Projected: 100 cards ✓
+3 adding · -1 cutting
```

When projected has errors:

```text
⚠ Projected deck illegal: 101 cards (remove 1)
[View Details]
```

### Do not block casual editing

Validation informs; only **Apply Changes** is blocked on LEGALITY errors. User can still mark ADD/CUT freely while deck is "illegal" — they need flexibility while building.

### Neo Brutalism styling

| Category       | Visual                       |
| -------------- | ---------------------------- |
| LEGALITY error | Red fill, black border, bold |
| WARNING        | Yellow accent                |
| RECOMMENDATION | Blue/secondary accent        |
| Success        | Green check, monospace count |

## Automation & Quality Gates

Reference: [`automation-strategy.md`](./automation-strategy.md) — Phase 13 matrix.

- [ ] **Unit tests — 100% coverage required:** `lib/format/**`
  - [ ] Commander count (0, 1, 2+)
  - [ ] Deck size 98/100/101
  - [ ] Duplicate non-basic detection; basic lands exempt
  - [ ] Color identity off-color cards
  - [ ] Scryfall legality field handling (banned, not_legal)
  - [ ] RECOMMENDATION thresholds (lands, ramp, draw) — configurable
  - [ ] Projected deck validation uses projected composition
- [ ] **Integration test:** warnings update when card status changes to ADD/CUT
- [ ] Separate test files per rule category for maintainability

## Testing Checklist

### Unit tests — Commander count

- [ ] 0 commanders → error
- [ ] 1 commander → pass
- [ ] 2 commanders → error

### Unit tests — Deck size

- [ ] 99 cards total → error (under)
- [ ] 100 cards → pass
- [ ] 101 cards → error (over)
- [ ] Commander included in count

### Unit tests — Duplicates

- [ ] 2x Sol Ring → error
- [ ] 2x Forest (basic) → pass
- [ ] Same oracleId different printings → error

### Unit tests — Color identity

- [ ] White commander + black card → error
- [ ] Mardu commander + Mardu cards → pass
- [ ] Colorless card in any deck → pass

### Unit tests — Legality

- [ ] Banned card → error when legality data present
- [ ] Missing legality → warning not error

### Unit tests — Recommendations

- [ ] 30 lands with min 33 → recommendation
- [ ] 7 ramp with min 8 → recommendation
- [ ] Config change updates thresholds

### Unit tests — Projected deck

- [ ] CURRENT 98 + ADD 2 = 100 → pass
- [ ] CURRENT 100 + ADD 1 - CUT 0 = 101 → error

### Integration tests

- [ ] Dashboard panel updates after adding card
- [ ] Apply changes blocked when projected illegal
- [ ] Settings threshold change reflects in warnings

### Manual iPhone testing

- [ ] Deck Check readable on small screen
- [ ] Warning list scrollable, tappable card links work
- [ ] Projected banner visible on changes screen

## Exit Criteria

- [ ] `FormatRules` interface defined with `CommanderRules` implementation
- [ ] Commander validation: count, 100 cards, duplicates, color identity working
- [ ] LEGALITY / RECOMMENDATION / WARNING categories correctly assigned
- [ ] Deck Check panel visible on deck dashboard
- [ ] Projected deck validation on changes screen
- [ ] Apply Changes blocked when projected deck has LEGALITY errors
- [ ] Recommendation thresholds configurable in Settings
- [ ] Scryfall legality used when available; graceful offline fallback
- [ ] Unit test coverage for all validator functions
- [ ] Validation completes in <50ms for 100-card deck
- [ ] No recommendations mislabeled as LEGALITY errors

## Risks & Mitigations

| Risk                                   | Impact                    | Mitigation                                                 |
| -------------------------------------- | ------------------------- | ---------------------------------------------------------- |
| Partner commanders not supported       | False LEGALITY errors     | Document MVP limitation; 2 commanders = error with message |
| oracleId missing on old cached cards   | Wrong duplicate detection | Fallback to cardId; trigger metadata refresh               |
| Users disagree with land/ramp defaults | Noise                     | Configurable thresholds; sensible defaults                 |
| Scryfall legality stale                | Wrong ban list            | Refresh on card fetch; show "as of [date]"                 |
| Over-validation annoys users           | Bad UX                    | Success messages; only block on apply                      |
| Performance on large decks             | UI jank                   | Memoize; debounce re-validation on rapid edits             |

## Out of Scope

- Partner / Background / Doctor commanders
- 99-card singleton formats with separate sideboard rules
- Standard, Modern, Pioneer, Pauper validation
- Full comprehensive rules (layer interactions, replacement effects)
- Automatic fix suggestions ("Remove 1 card") with one-tap fix
- Rules text parsing for legality
- Sideboard validation for Commander (warn only if sideboard cards present)
- Bracket / power level recommendations

## Handoff to Next Phase

**Next: Phase 14 — UX Polish**

Phase 13 adds functional validation that may increase UI density with warnings. Phase 14 will polish transitions, loading skeletons, offline indicator, undo snackbars, and safe-area tuning so the app feels intentional on iPhone.

Before handoff:

1. Deck Check panel placement confirmed — Phase 14 will refine animations and skeleton states.
2. Validation re-render frequency profiled — Phase 14 may debounce UI updates.
3. Error/warning colors audited against Neo Brutalism tokens — Phase 14 theme review covers consistency.
