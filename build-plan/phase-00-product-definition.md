# Phase 00 — Product Definition

## Agent Handoff Prompt

```
You are executing Phase 0 (Product Definition) of the MTG Deck Builder PWA.

Workspace: mtg-deck-manager
Read first: plans/mtg-deck-builder-web-app-build-plan.md (sections 1–8, 12–13, 23, 28–31, 46, 63, 73)

This phase is documentation-only — no application code yet.

Deliverables:
1. docs/product-spec.md — locked MVP product specification
2. docs/data-model.md — TypeScript interfaces for all core entities
3. docs/decisions.md — ADR-style log of key product/tech decisions
4. docs/example-deck-soldier-swarm.md — concrete example deck with ADD/CUT/CONSIDER cards and wishlist

Lock these decisions in writing:
- App name: MTG Deck Builder (or confirm with user)
- MVP format: Commander primary; other formats stubbed for later
- Local-first, no login, IndexedDB/Dexie persistence
- Deck card statuses: current | add | cut | consider
- Initial role catalog (26 roles from master plan §12)
- Initial synergy tags (23 tags from master plan §13)
- Pricing: Scryfall prices first; PricingProvider abstraction; TCGplayer links not API
- Card source: Scryfall API; oracleId vs printingId distinction
- Import/export: JSON backup (full + single deck), text decklist, CSV
- Theme: tweakcn Neo Brutalism — no dilution

Example deck must include:
- One Commander deck (Soldier theme, Mardu colors)
- 5 cards marked ADD, 3 marked CUT, 4+ marked CONSIDER
- A wishlist with 3+ items

Exit: All docs exist; any open questions flagged in docs/decisions.md for user review.
Do NOT start Next.js setup — that is Phase 1.
```

## Overview

Phase 0 locks the **product model** before any code is written. Implementation agents in Phases 1–16 will reference these documents as the source of truth for data shapes, UX workflows, and scope boundaries.

Skipping this phase leads to inconsistent interfaces, scope creep, and rework in the Dexie schema (Phase 3) and deck workflow (Phases 5–7).

## Goal

Produce a small but complete product specification that answers every "what are we building?" question for the MVP, with a concrete example deck that validates the ADD/CUT/CONSIDER workflow.

## Prerequisites

- Master build plan at `plans/mtg-deck-builder-web-app-build-plan.md` reviewed.
- No code dependencies.

## Dependencies on Previous Phases

None — this is the first phase.

## Duration Estimate

| Skill Level | Estimate  |
| ----------- | --------- |
| Any         | 0.5–1 day |

## Architecture & Key Decisions

Document each decision in `docs/decisions.md` with context, decision, and consequences.

### Decision 1: Local-first, no account

- **Context:** Decks are small; core value is personal deck iteration.
- **Decision:** IndexedDB on device; export/import for portability; no cloud DB in MVP.
- **Consequences:** iOS Home Screen storage isolation must be communicated in onboarding (Phase 2).

### Decision 2: Single deck-card model with status field

- **Context:** Users need CURRENT, ADD, CUT, CONSIDER views without duplicate data.
- **Decision:** One `DeckCard` record per card-in-deck; `status` field drives filtered views.
- **Consequences:** Projected deck = CURRENT + ADD − CUT (Phase 7).

### Decision 3: oracleId vs printingId

- **Context:** Same card name, many printings; prices and images vary by printing.
- **Decision:** `oracleId` = Scryfall `oracle_id` (identity); `Card.id` = Scryfall `id` (printing).
- **Consequences:** Deck cards reference printing `Card.id`; search can default to preferred printing.

### Decision 4: Commander-first MVP

- **Context:** Primary user workflow is Commander upgrade tracking.
- **Decision:** Full Commander validation in Phase 13; other formats enum-stubbed only.
- **Consequences:** Deck size default 100; commander zone required.

### Decision 5: Pricing provider abstraction

- **Context:** TCGplayer API access restricted; Scryfall includes USD/EUR prices.
- **Decision:** `PricingProvider` interface; `ScryfallPricingProvider` first; never show $0 on failure.
- **Consequences:** Phase 8 implementation is straightforward.

## Data Model Impact

Create `docs/data-model.md` with these interfaces (copy from master plan §7, expand as needed):

```ts
type DeckFormat =
  | "commander"
  | "standard"
  | "modern"
  | "pioneer"
  | "legacy"
  | "vintage"
  | "other";
type DeckCardStatus = "current" | "add" | "cut" | "consider";
type DeckCardZone = "commander" | "mainboard" | "sideboard" | "maybeboard";

interface Deck {
  /* id, name, format, commanderId, timestamps, activeVersionId */
}
interface DeckCard {
  /* id, deckId, cardId, quantity, zone, status, roles, synergies, ... */
}
interface Card {
  /* id, oracleId, name, manaCost, typeLine, images, scryfallUri, tcgplayerUri, ... */
}
interface CardPrice {
  /* cardId, currency, low, market, source, fetchedAt */
}
interface Tag {
  /* id, name, category: role | synergy | custom */
}
interface DeckVersion {
  /* id, deckId, name, snapshot, notes, createdAt */
}
interface WishlistItem {
  /* id, cardId, quantity, priority, targetDeckId, notes */
}
```

## Routes / Screens

Document intended routes in `docs/product-spec.md` (no implementation yet):

```text
/                    Home
/decks               Deck list
/decks/[deckId]      Deck dashboard
/decks/[deckId]/cards
/decks/[deckId]/changes
/decks/[deckId]/stats
/cards               Card search
/wishlist
/settings
/settings/data
```

## File Structure

```text
docs/
  product-spec.md           # MVP scope, workflows, screen inventory
  data-model.md             # All TypeScript interfaces
  decisions.md              # ADR log
  example-deck-soldier-swarm.md   # Concrete example data
```

## Detailed Task List

### Product identity

- [ ] Confirm app name (`MTG Deck Builder` or user preference)
- [ ] Write one-paragraph product vision in `product-spec.md`
- [ ] Document target device (iPhone portrait) and hosting (Vercel)

### MVP scope lock

- [ ] List all in-scope features (from master plan §63)
- [ ] List all explicitly out-of-scope items (accounts, cloud sync, AI, etc.)
- [ ] Define "Definition of Done" workflow (master plan §70) as acceptance test narrative

### Deck status model

- [ ] Document CURRENT, ADD, CUT, CONSIDER with state transition diagram
- [ ] Specify that filtered views are derived, not separate tables
- [ ] Document "Apply Changes" behavior (ADD→CURRENT, remove CUT, clear status)

### Roles and synergies

- [ ] Copy initial role catalog (26 roles) into `product-spec.md`
- [ ] Copy initial synergy tags (23 tags) into `product-spec.md`
- [ ] Specify multi-select behavior; user-editable custom tags
- [ ] Note: no auto-classification in MVP

### Pricing strategy

- [ ] Document `PricingProvider` interface intent
- [ ] Confirm Scryfall as first price source
- [ ] Confirm TCGplayer outbound links only (no API dependency)
- [ ] Document fallback UX: "Price unavailable" + last known + timestamp

### Card data policy

- [ ] Scryfall as sole card metadata source
- [ ] Cache metadata + image URLs locally; do not bulk-download all images
- [ ] Rate limit respect (~50–100ms between sequential requests)

### Import/export formats

- [ ] Full backup JSON schema version field
- [ ] Single deck: JSON, plain text list, CSV
- [ ] Import: JSON backup, text decklist (Archidekt/Moxfield format later)

### Example deck: Soldier Swarm

- [ ] Commander: e.g. Iroas, God of Victory or Adeline, Resplendent Cathar
- [ ] Format: Commander, Mardu (R/W/B)
- [ ] ~20 CURRENT cards listed (representative, not full 100)
- [ ] 5 ADD cards with roles/synergies (e.g. Skullclamp, Heroic Reinforcements)
- [ ] 3 CUT cards with reason notes
- [ ] 4+ CONSIDER cards
- [ ] Wishlist: 3+ items with priority (Essential/High/Medium/Low)

### Theme confirmation

- [ ] Link Neo Brutalism JSON: https://tweakcn.com/r/themes/neo-brutalism.json
- [ ] Document semantic status colors: current=neutral, add=green, cut=red, consider=yellow
- [ ] Document density modes: compact, comfortable, image

### Open questions

- [ ] Flag any unresolved decisions in `decisions.md` with `[OPEN]` prefix
- [ ] Currency preference default (USD vs EUR) — document choice

## Implementation Notes

This phase produces **markdown only**. The example deck can use real card names from Scryfall for realism.

Example ADD/CUT table format for `example-deck-soldier-swarm.md`:

```markdown
| Card       | Status | Roles     | Synergies        | Notes             |
| ---------- | ------ | --------- | ---------------- | ----------------- |
| Skullclamp | ADD    | Card Draw | Equipment, Token | Core draw engine  |
| ...        | CUT    | ...       | ...              | Too slow for meta |
```

## Automation & Quality Gates

Reference: [`automation-strategy.md`](./automation-strategy.md) — Phase 0 matrix.

- [ ] `docs/decisions.md`: record Vitest + TestCafe + Knip + MSW + GitHub Actions as official toolchain
- [ ] `docs/product-spec.md`: map Definition of Done (§70) to numbered E2E test cases for Phase 15
- [ ] `docs/product-spec.md`: require `data-testid` convention on critical UI (see automation-strategy.md)
- [ ] Example deck in `docs/example-deck-soldier-swarm.md` serves as fixture spec for Phases 3–7 tests

## Testing Checklist

- [ ] `docs/product-spec.md` covers all MVP features from master plan §63
- [ ] `docs/data-model.md` interfaces match master plan §7
- [ ] Example deck has exact counts: 5 ADD, 3 CUT, 4+ CONSIDER, 3+ wishlist
- [ ] No contradictions between docs and master plan
- [ ] All `[OPEN]` items are explicit, not silent assumptions

## Exit Criteria

- Four doc files exist under `docs/`
- Product model is locked enough for Phase 1 agent to scaffold without ambiguity
- Example deck validates the upgrade-tracking workflow end-to-end on paper

## Risks & Mitigations

| Risk                         | Mitigation                                                |
| ---------------------------- | --------------------------------------------------------- |
| Scope creep during spec      | Strict out-of-scope list; defer to post-MVP               |
| Wrong data model early       | oracleId/printingId decided here; reviewed before Phase 3 |
| User disagrees with defaults | `[OPEN]` flags in decisions.md for user sign-off          |

## Out of Scope

- Any application code or repository setup
- Visual design mockups (theme JSON is sufficient)
- Scryfall API integration

## Handoff to Next Phase

Before starting **Phase 1**, confirm:

1. `docs/product-spec.md`, `docs/data-model.md`, `docs/decisions.md` exist
2. Example deck document is complete
3. User has reviewed any `[OPEN]` decisions (or agent proceeds with documented defaults)

Phase 1 agent reads `docs/` before scaffolding Next.js.
