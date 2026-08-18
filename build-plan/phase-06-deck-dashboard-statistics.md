# Phase 06 — Deck Dashboard & Statistics

## Agent Handoff Prompt

```
You are implementing Phase 6 (Deck Dashboard & Statistics) of the MTG Deck Builder web app.

Workspace: mtg-deck-manager
Read first:
- plans/mtg-deck-builder-web-app-build-plan.md (sections 10, 17, 34, 35, 52)
- build-plan/phase-05-deck-management.md (deck routes, DeckCard model, services)
- build-plan/phase-06-deck-dashboard-statistics.md (this document — follow it completely)

Prerequisites: Phases 0–5 complete (decks with cards, statuses, roles, synergies).

Your mission:
1. Build deck statistics engine in lib/deck/stats/ (pure functions, unit tested).
2. Enhance /decks/[deckId] dashboard with composition widgets and summary metrics.
3. Create /decks/[deckId]/stats dedicated statistics page.
4. Implement mana curve, type/color distribution, role/synergy counts, status counts.
5. Build deck warnings panel (legality vs recommendation categories) using format-rules service stub.
6. Ensure dashboard updates reactively when deck cards change (TanStack Query invalidation).

Do NOT implement upgrade cost/pricing (Phase 8), projected deck value (Phase 7), or full format validation engine (Phase 13).

Exit criteria: Dashboard and stats page update immediately after deck edits; warnings surface actionable Commander issues.

When done, verify against the Testing Checklist and Exit Criteria in this document.
```

## Overview

Phase 6 transforms raw deck lists into **actionable intelligence**. The deck dashboard becomes the command center: card counts, composition charts, role coverage, synergy distribution, status breakdown (how many ADD/CUT/CONSIDER), and a **Deck Check** warnings panel. All calculations are derived from `Deck` + `DeckCard[]` + joined `Card[]` metadata — nothing stored redundantly except optional memoized caches in React Query.

Statistics must update **immediately** when the user edits cards (same session, no manual refresh). Pure calculation functions in `lib/deck/stats/` enable unit testing without UI.

## Goal

Provide at-a-glance deck composition, health metrics, and validation warnings on the deck dashboard and dedicated stats page.

## Prerequisites

- **Phase 5:** Deck CRUD, deck cards with zones/statuses/roles/synergies, `/decks/[deckId]`, `/decks/[deckId]/cards`.
- **Phase 4:** Card metadata (manaValue, typeLine, colors, colorIdentity).
- **Phase 3:** Tags table for role/synergy display names.

## Dependencies on Previous Phases

| Prior Phase | What Phase 6 Consumes                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Phase 5     | `useDeck`, `useDeckCards`, `DeckCard` statuses/zones/roles             |
| Phase 4     | `Card.manaValue`, `Card.typeLine`, `Card.colors`, `Card.colorIdentity` |
| Phase 5     | `Deck.format`, `Deck.commanderId`, commander zone card                 |
| Phase 1     | shadcn Card, Progress, Badge; chart library if added                   |

### Optional package

```bash
npm install recharts
# OR use CSS-only bar charts for Neo Brutalism consistency (recommended for theme fidelity)
```

Prefer **custom CSS bar components** over rounded chart defaults to match Neo Brutalism (square bars, hard borders).

## Duration Estimate

| Skill Level | Estimate |
| ----------- | -------- |
| Experienced | 4–6 days |
| Moderate    | 6–9 days |

Breakdown:

- Stats calculation library: 1.5–2 days
- Format rules / warnings service: 1–1.5 days
- Dashboard widgets: 1.5–2 days
- Stats page + testing: 1 day

## Architecture & Key Decisions

### Pure stats engine

All aggregations in `lib/deck/stats/` — **no side effects**, no DB access.

```ts
interface DeckStatsInput {
  deck: Deck;
  deckCards: DeckCardWithCard[]; // DeckCard + resolved Card
  tags?: Tag[]; // optional, for display names
}

interface DeckStats {
  counts: DeckCountStats;
  manaCurve: ManaCurveData;
  typeDistribution: DistributionItem[];
  colorDistribution: ColorDistribution;
  roleDistribution: DistributionItem[];
  synergyDistribution: DistributionItem[];
  statusCounts: StatusCounts;
  manaSources: number; // rocks, dorks, etc. — role-based
  averageManaValue: number; // non-lands
}
```

### Which cards to include in stats

| View                                      | Inclusion Rule                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| **Current deck stats**                    | `status === 'current'` AND `zone !== 'maybeboard'`                       |
| **Projected stats** (preview for Phase 7) | `(current OR add) AND NOT cut` — implement function now, wire in Phase 7 |
| **Upgrade delta**                         | Compare current vs projected — stub on dashboard                         |

Commander counted in mainboard count for Commander format (99 + commander = 100) per common convention.

Document clearly in code:

```ts
function getActiveDeckCards(cards, mode: "current" | "projected"): DeckCard[];
```

### Mana curve buckets

Buckets 0–6+ (7+ grouped as "7+"):

```ts
type ManaCurve = Record<number, number>; // cmc -> count (summed quantities)
```

- Use `Card.manaValue` (Scryfall `cmc`).
- Lands typically MV 0 — include in curve unless user setting "exclude lands" (default: include).
- Split/adventure cards: use primary face MV from Card root.

### Type distribution parsing

Parse `Card.typeLine` — primary type before em dash:

```ts
"Legendary Creature — Human Soldier" → Creature
"Instant" → Instant
"Land — Plains" → Land
"Artifact Creature — Construct" → Artifact Creature (or split: count as Creature for high-level pie — **decision: use first type word unless "Artifact Creature" → categorize as Creature**)

Categories for MVP:
- Creature
- Instant
- Sorcery
- Artifact
- Enchantment
- Planeswalker
- Land
- Other
```

Use regex: `/^(Legendary\s+)?([\w\s]+?)(\s—|$)/`.

### Color distribution

Count colored pips presence (not mana base production):

- For each non-land card, increment each color in `Card.colors` by quantity.
- Separate **Color identity** chart for commander deck (union of all cards' `colorIdentity`).
- Colorless cards increment `C` bucket.

Display W/U/B/R/G/C bars with MTG mana symbol colors (theme-adjusted for Neo Brutalism borders).

### Role and synergy distribution

Count **deck cards**, not unique tags:

- Card with 2 roles counts toward both role buckets.
- Use tag id → resolve name via Tag map.
- Sort descending by count; show top 8 + "Other" bucket.

### Status counts

```ts
interface StatusCounts {
  current: number;
  add: number;
  cut: number;
  consider: number;
}
```

Sum `quantity` per status across all zones (including maybeboard for visibility).

Display on dashboard as upgrade progress indicator:

```text
+8 ADD  ·  -3 CUT  ·  5 CONSIDER
```

### Deck warnings service

Create `lib/deck-rules/` (or `lib/format/`):

```ts
type WarningSeverity = 'legality' | 'warning' | 'recommendation';

interface DeckWarning {
  id: string;
  severity: WarningSeverity;
  message: string;
  detail?: string;
}

interface FormatRules {
  getDeckWarnings(input: DeckStatsInput): DeckWarning[];
}

// lib/deck-rules/commander-rules.ts
export const commanderRules: FormatRules = { ... }
```

**Commander checks (MVP):**

| Check                                           | Severity       |
| ----------------------------------------------- | -------------- |
| No commander set                                | legality       |
| Deck size ≠ 100 (including commander)           | legality       |
| Duplicate non-basic oracle names in active deck | legality       |
| Card outside commander color identity           | legality       |
| Less than 33 lands                              | recommendation |
| Less than 8 ramp sources (role: Ramp)           | recommendation |
| Less than 8 card draw sources                   | recommendation |
| Less than 8 removal sources                     | recommendation |

Ramp/draw/removal counts use **role tags** assigned by user — if unassigned, under-count is expected; message should say "Based on assigned roles".

Do not claim Wizards official legality without Scryfall `legalities` field — optionally fetch from Card extension:

```ts
// Future: Card.legalities.commander === 'legal'
```

For Phase 6, color identity check is essential; full legality optional if Scryfall legality cached on Card.

### Reactive updates

`useDeckStats(deckId)` hook:

```ts
const { data: deckCards } = useDeckCards(deckId);
return useMemo(() => computeDeckStats({ deck, deckCards }), [deck, deckCards]);
```

Alternatively TanStack Query:

```ts
useQuery({
  queryKey: ['decks', deckId, 'stats'],
  queryFn: () => computeDeckStats(...),
  enabled: !!deckCards,
});
```

Invalidate `['decks', deckId, 'stats']` on any deck card mutation from Phase 5.

### Dashboard vs stats page

| Location                | Content                                                                      |
| ----------------------- | ---------------------------------------------------------------------------- |
| `/decks/[deckId]`       | Summary metrics, mini mana curve, top warnings, status counts, quick actions |
| `/decks/[deckId]/stats` | Full-size charts, all distributions, complete warnings list, detailed tables |

Avoid duplication — shared widget components with `compact` prop.

## Data Model Impact

**No new Dexie tables** in Phase 6.

Optional extensions to `Card` (if not present) for warnings:

```ts
interface Card {
  // ...
  legalities?: {
    commander?: "legal" | "not_legal" | "restricted" | "banned";
    // other formats
  };
}
```

Update Phase 4 normalizer to map Scryfall `legalities` — small additive change.

Optional `Deck` settings for recommendation thresholds:

```ts
interface Deck {
  // ...
  statsPreferences?: {
    minLands?: number; // default 33
    minRamp?: number; // default 8
    minDraw?: number; // default 8
    minRemoval?: number; // default 8
  };
}
```

Store on deck or global settings — default globally in `lib/deck-rules/thresholds.ts` for MVP.

## Routes / Screens

| Route                   | Purpose                      |
| ----------------------- | ---------------------------- |
| `/decks/[deckId]`       | Enhanced dashboard (primary) |
| `/decks/[deckId]/stats` | Full statistics page         |

Enable previously stubbed **Stats** sub-nav tab from Phase 5.

### Dashboard layout (mobile)

```text
┌─────────────────────────────┐
│ Soldier Swarm               │
│ Commander · Adeline         │
│ [Edit Cards] [Add] [Stats]  │
├─────────────────────────────┤
│ 100 / 100 cards             │
│ +8 ADD · -3 CUT · 5 CONSIDER│
├─────────────────────────────┤
│ DECK CHECK                  │
│ ✓ Commander set             │
│ ✓ 100 cards                 │
│ ⚠ 31 lands (rec: 33+)       │
├─────────────────────────────┤
│ MANA CURVE (mini)           │
│ ▂▄█▅▃▂▁                     │
├─────────────────────────────┤
│ TYPES · COLORS (summary)    │
└─────────────────────────────┘
```

### Stats page layout

Sections stacked vertically:

1. Deck size breakdown (commander/mainboard/sideboard)
2. Mana curve (full histogram)
3. Card types (horizontal bar chart)
4. Color distribution
5. Roles (table)
6. Synergies (table)
7. Status breakdown
8. Full warnings list with severity icons

## File Structure (files to create/modify)

```text
lib/
  deck/
    stats/
      index.ts
      compute-deck-stats.ts
      mana-curve.ts
      type-distribution.ts
      color-distribution.ts
      role-distribution.ts
      status-counts.ts
      deck-size.ts
      filters.ts              # getActiveDeckCards, projected mode
    stats/types.ts
  deck-rules/
    index.ts
    types.ts
    commander-rules.ts
    duplicate-detection.ts    # may extend Phase 5
    color-identity.ts
    thresholds.ts
  hooks/
    use-deck-stats.ts
    use-deck-warnings.ts

components/
  deck/
    deck-dashboard.tsx
    deck-stats-summary.tsx
    deck-mana-curve-chart.tsx
    deck-distribution-chart.tsx
    deck-color-chart.tsx
    deck-role-table.tsx
    deck-synergy-table.tsx
    deck-status-summary.tsx
    deck-warning-list.tsx
    deck-warning-item.tsx
    deck-size-badge.tsx
    deck-stats-page.tsx

app/
  decks/
    [deckId]/
      page.tsx                # replace stub with DeckDashboard
      stats/
        page.tsx
```

## Detailed Task List

### 6.1 — Stats types and filters

- [ ] Create `lib/deck/stats/types.ts` with all output interfaces.
- [ ] Create `lib/deck/stats/filters.ts`:
  - [ ] `getCurrentDeckCards(deckCards): DeckCard[]` — status current, exclude maybeboard optional.
  - [ ] `getProjectedDeckCards(deckCards): DeckCard[]` — (current OR add) AND status !== cut.
  - [ ] `withResolvedCards(deckCards, cardMap): DeckCardWithCard[]`.
- [ ] Unit tests for filter edge cases (empty deck, all cut, mixed statuses).

### 6.2 — Deck size calculations

- [ ] Create `lib/deck/stats/deck-size.ts`:
  - [ ] `computeDeckSize(deck, deckCards, mode)` → `{ total, commander, mainboard, sideboard, maybeboard }`
  - [ ] Commander format: total including commander = 100 target.
- [ ] `DeckSizeBadge` component — `"98 / 100"` with color when ≠ target.

### 6.3 — Mana curve

- [ ] Create `lib/deck/stats/mana-curve.ts`:
  - [ ] `computeManaCurve(cards, options?: { excludeLands?: boolean })`
  - [ ] Return array `[{ cmc: 0, count: 5 }, ..., { cmc: 7, label: '7+', count: 3 }]`
- [ ] `DeckManaCurveChart` — CSS flex bars, Neo Brutalism styling.
- [ ] Props: `compact?: boolean` for dashboard mini version.
- [ ] Show total non-land CMC average below chart.

### 6.4 — Type distribution

- [ ] Create `lib/deck/stats/type-distribution.ts`:
  - [ ] `parsePrimaryType(typeLine: string): string`
  - [ ] `computeTypeDistribution(cards): DistributionItem[]`
- [ ] Include land count prominently.
- [ ] `DeckDistributionChart` reusable for types.

### 6.5 — Color distribution

- [ ] Create `lib/deck/stats/color-distribution.ts`:
  - [ ] `computeColorDistribution(cards)` — pip counts.
  - [ ] `computeColorIdentity(deck, cards)` — commander deck identity union.
- [ ] `DeckColorChart` — segmented horizontal bar WUBRGC.

### 6.6 — Role and synergy distribution

- [ ] Create `lib/deck/stats/role-distribution.ts`:
  - [ ] Count by role tag id on each deck card × quantity.
  - [ ] Resolve names via Tag lookup map.
- [ ] Synergy distribution — same pattern.
- [ ] `DeckRoleTable`, `DeckSynergyTable` — sortable simple tables for stats page.

### 6.7 — Status counts

- [ ] Create `lib/deck/stats/status-counts.ts`.
- [ ] `DeckStatusSummary` — colored chips with counts for dashboard.

### 6.8 — Master compute function

- [ ] Create `lib/deck/stats/compute-deck-stats.ts`:
  - [ ] `computeDeckStats(input: DeckStatsInput, mode?: 'current' | 'projected'): DeckStats`
  - [ ] Orchestrate all sub-computations.
- [ ] Export from `lib/deck/stats/index.ts`.

### 6.9 — Format rules / warnings

- [ ] Create `lib/deck-rules/types.ts`.
- [ ] Create `lib/deck-rules/color-identity.ts`:
  - [ ] `getCommanderColorIdentity(commanderCard: Card): string[]`
  - [ ] `isWithinColorIdentity(card: Card, identity: string[]): boolean`
- [ ] Create `lib/deck-rules/duplicate-detection.ts`:
  - [ ] `findDuplicateOracleNames(deckCards, cards): DeckWarning[]`
- [ ] Create `lib/deck-rules/commander-rules.ts`:
  - [ ] Implement all MVP checks from Architecture section.
- [ ] Create `lib/deck-rules/thresholds.ts` — default recommendation numbers.
- [ ] `getDeckWarnings(input, format)` — dispatcher; only Commander fully implemented.

### 6.10 — Extend Scryfall normalizer (optional)

- [ ] Map `legalities.commander` onto `Card.legalities`.
- [ ] Add warning for `not_legal` / `banned` cards in deck.

### 6.11 — React hooks

- [ ] `useDeckStats(deckId, mode?)` — joins deck cards + cards, computes stats.
- [ ] `useDeckWarnings(deckId)` — separate hook for warnings (may be expensive).
- [ ] Memoize; recalculate when deckCards query updates.

### 6.12 — Dashboard UI

- [ ] Create `DeckDashboard` composite component.
- [ ] Update `app/decks/[deckId]/page.tsx` to render dashboard.
- [ ] Sections: header (Phase 5), size badge, status summary, warnings (top 3 + "View all"), mini mana curve, type/color summary row.
- [ ] Link "View Stats" → `/decks/[deckId]/stats`.
- [ ] Link "Review Changes" → `/decks/[deckId]/changes` (Phase 7 — show disabled or preview status counts).

### 6.13 — Stats page UI

- [ ] Create `app/decks/[deckId]/stats/page.tsx`.
- [ ] `DeckStatsPage` — full layout with all widgets.
- [ ] Toggle: Current / Projected view (projected uses same compute with mode — preview for Phase 7).
- [ ] Sticky deck name header with back navigation.

### 6.14 — Warning list UI

- [ ] `DeckWarningList` — group by severity (Legality first).
- [ ] `DeckWarningItem` — icon + message + optional detail expand.
- [ ] Icons: ✓ pass (green), ⚠ warning (yellow), ✗ legality (red).
- [ ] Text labels alongside colors (accessibility).

### 6.15 — Navigation integration

- [ ] Enable Stats tab in deck sub-nav.
- [ ] Dashboard primary actions remain: Edit Cards, Add Card, Stats, Changes.

### 6.16 — Performance

- [ ] Ensure stats recompute < 16ms for 100-card deck (profile in dev).
- [ ] Avoid re-fetching all Cards if already in deckCards query cache.
- [ ] `useMemo` on expensive distributions.

### 6.17 — Empty and loading states

- [ ] Empty deck → "Add cards to see statistics" CTA.
- [ ] Skeleton loaders for charts while cards loading.

## Implementation Notes

### Projected mode preview

Implement `getProjectedDeckCards` and projected stats now:

```ts
// Cards that would remain after applying changes
status === 'cut' → excluded
status === 'add' → included
status === 'current' → included
```

Phase 7 will use identical logic for projected deck view — **single source of truth** in `lib/deck/stats/filters.ts`.

### Commander card counting

Two common conventions:

1. Commander **included in** 100 — show `99 mainboard + 1 commander = 100`
2. Commander **separate** — show `100 mainboard + commander`

**Use convention 1** (parent plan: "100-card deck including commander"):

```ts
totalCount = sum(mainboard current) + (commander ? 1 : 0)
target = 100
```

### Mana source count

Count cards with role tag `Ramp` OR type-based heuristic (optional fallback):

```ts
// Heuristic fallback if no roles assigned — defer or show "Assign roles for accurate ramp count"
```

Prefer role-based only for MVP to avoid false positives.

### Neo Brutalism charts

Avoid soft rounded Recharts defaults. Build simple div-based bars:

```tsx
<div className="flex h-24 items-end gap-1 border-2 border-black">
  {buckets.map((b) => (
    <div
      key={b.cmc}
      className="bg-primary flex-1 border border-black"
      style={{ height: `${pct}%` }}
    />
  ))}
</div>
```

Label each bar with CMC number below.

### Warnings configurability

Store thresholds in settings later; hardcode defaults in Phase 6:

```ts
export const DEFAULT_THRESHOLDS = {
  minLands: 33,
  minRamp: 8,
  minDraw: 8,
  minRemoval: 8,
};
```

### Estimated deck value placeholder

Dashboard may show:

```text
Estimated value: —
Upgrade cost: —
```

Wire as disabled until Phase 8; do not show `$0.00`.

## Automation & Quality Gates

Reference: [`automation-strategy.md`](./automation-strategy.md) — Phase 6 matrix.

- [ ] **Unit tests (100% of pure functions):** mana curve, type/color distribution, role/synergy counts, land count, status counts
- [ ] **Unit tests:** empty deck edge cases, commander in/out of mainboard count
- [ ] **Unit tests:** warning categorization stub (LEGALITY vs RECOMMENDATION)
- [ ] **Integration test:** stats recompute after deck card status change
- [ ] All tests in `tests/unit/deck/stats/` — no DOM required

## Testing Checklist

### Unit tests (`lib/deck/stats/`, `lib/deck-rules/`)

- [ ] Mana curve with mixed quantities.
- [ ] Type parsing for Legendary, Artifact Creature, Land.
- [ ] Color distribution multicolor cards.
- [ ] Role double-counting (two roles on one card).
- [ ] Status counts sum quantities correctly.
- [ ] Projected filter: current + add - cut logic.
- [ ] Commander size exactly 100 passes.
- [ ] Duplicate non-basic detected.
- [ ] Basic lands duplicated allowed.
- [ ] Color identity violation detected.
- [ ] Recommendation warnings for low lands/ramp.

### Integration tests

- [ ] Add card to deck → dashboard count updates without refresh.
- [ ] Mark card as CUT → current stats exclude, projected includes/excludes correctly.
- [ ] Assign Ramp role → ramp count increases in warnings.

### Manual tests

- [ ] Dashboard readable on iPhone portrait.
- [ ] Stats page scroll performance smooth.
- [ ] Toggle current/projected updates all widgets.
- [ ] Empty deck shows helpful empty state.

## Exit Criteria

- [ ] `/decks/[deckId]` shows live summary: size, status counts, mini curve, top warnings.
- [ ] `/decks/[deckId]/stats` shows full mana curve, type/color/role/synergy breakdowns.
- [ ] Warnings distinguish legality vs recommendation.
- [ ] Commander deck size and duplicate checks work.
- [ ] All stats update immediately after deck card mutations.
- [ ] Pure stats functions have ≥80% coverage on critical paths.
- [ ] Projected stats mode implemented (used by Phase 7).

## Risks & Mitigations

| Risk                                             | Impact                | Mitigation                                           |
| ------------------------------------------------ | --------------------- | ---------------------------------------------------- |
| Unassigned roles → useless recommendation counts | User ignores warnings | Copy: "Based on assigned roles"; prompt to tag       |
| typeLine parsing edge cases                      | Wrong type pie        | Unit tests; fallback to Other                        |
| Performance on large decks                       | UI jank               | Memoization; pure functions                          |
| Projected vs current confusion                   | User misreads stats   | Clear toggle labels; legend                          |
| Missing Card legalities                          | Incomplete legality   | Extend Scryfall normalizer                           |
| Over-scoping validation                          | False legality claims | Separate severity categories; conservative messaging |

## Out of Scope (defer to later phases)

- Price / estimated deck value / upgrade cost (Phase 8).
- Need-to-add and cards-to-cut screens (Phase 7).
- Apply changes workflow (Phase 7).
- Full format support beyond Commander (Phase 13).
- Sideboard-specific stats for competitive formats.
- Historical stats across deck versions (Phase 11).
- Export stats as image/PDF.
- AI role auto-suggestion.
- Synergy scoring algorithms.

## Handoff to Next Phase

**Phase 7 (Changes & Upgrade Workflow)** will consume:

- `getProjectedDeckCards()` and projected stats mode
- `StatusCounts` on dashboard (already visible)
- `/decks/[deckId]/changes` route (enable tab)
- Warning panel awareness of ADD/CUT imbalance

Ensure:

1. `computeDeckStats(input, 'projected')` is tested and exported.
2. Status summary widget links to changes sub-routes.
3. Dashboard "Review Changes" button navigates to Phase 7 changes hub.

---

_Parent plan: `plans/mtg-deck-builder-web-app-build-plan.md`_
