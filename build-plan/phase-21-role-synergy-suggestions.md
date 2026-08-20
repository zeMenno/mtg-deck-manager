# Phase 21 — Role & Synergy Suggestions

> **Status: Implemented** (2026-08-20). Shipped in-repo as **v1.4.0**.

## Agent Handoff Prompt

```
You are implementing Phase 21 (Role & Synergy Suggestions) of the MTG Deck
Builder PWA.

Workspace: mtg-deck-manager
Read first:
- build-plan/phase-21-role-synergy-suggestions.md (this document — follow every section)
- docs/product-spec.md §5 (26 roles, 23 synergies, tags live on DeckCard)
- docs/decisions.md (ADR-008, ADR-014, ADR-026)
- lib/db/seed/default-tags.ts
- build-plan/phase-18-solar-dusk-theme.md

Prerequisites: Phases 0–20 complete.

Goal: Suggest role and synergy tags for deck cards using local, deterministic
rules (type line, keywords, oracle text) plus Archidekt category maps from
Phase 20. Apply only to empty tag arrays unless the user confirms overwrite.
Always allow edit/remove.

Constraints:
- This is NOT Archidekt auto-categories. Archidekt uses *their* crowd-applied
  labels. We do not have that dataset and must not scrape Archidekt/EDHREC.
- This is NOT EDHREC "synergy %". That metric is "how often this card appears
  with this commander vs the colour identity," not "this card is a Soldier
  payoff."
- Do not download Scryfall's full card bulk. Do not require Scryfall Tagger
  bulk data for the exit criteria (optional stretch only).
- Do not call an LLM. Product spec still forbids AI recommendations.
- Never silently overwrite user tags.
- Solar Dusk. Tests ship with the feature. CI green.

When done, verify every Exit Criteria item and confirm CI is green.
```

## Overview

The user asked to "automatically place cards into synergy types and role types" because other apps do it. That sentence hides three different products:

| What other software actually does | Can we copy it? |
| --------------------------------- | --------------- |
| **Archidekt auto-categories** | Crowd mode of the ~30 most common *user* categories on *their* decks, applied at add time, opt-out, **not retroactive**. Not oracle-text. We have no corpus. |
| **Moxfield global tags** | *You* tag Sol Ring as Ramp once; it applies across *your* decks. That is user memory, not inference. |
| **EDHREC synergy %** | Statistical lift vs colour identity. Useful for recommendations, not for filling our 26×23 catalog. Needs a deck corpus we do not store. |
| **Scryfall Tagger `otag:` / `function:`** | Community oracle tags (ramp, removal, draw, …). Closest *public* analogue. Distributed as **bulk files**, not on each `/cards/{id}` payload. Product spec still says no full Scryfall bulk download. |
| **Type-line buckets** | Creatures / Instants — we already chart those in Phase 6. They are **not** our role catalog. |

So "do what Archidekt does" is not implementable as a local-first app without either (a) shipping a frozen snapshot of someone else's labels or (b) inventing heuristics. This phase does **(b)** plus import-time mapping from Phase 20, and it **suggests** rather than silently filing cards.

ADR-008 still holds: Skullclamp is Card Draw in a token deck and a combo piece elsewhere. Auto-place as the only tag would be wrong even if the heuristic is good.

## Goal

1. `suggestTags(card, ctx?) → { roles, synergies, reasons[] }` — pure function, unit-tested.
2. On add (optional setting, default **on for empty tags only**): pre-fill the role/synergy pickers, still editable.
3. Deck action **Suggest tags…**: preview per card, apply to cards with empty roles and empty synergies (default), optional "fill empty slots only" vs "replace".
4. Map obvious kindred synergies from `type_line` (Soldier, Human, Warrior, Knight) without tagging every card Tribal.
5. Leave strategy synergies (Aggro, Control, Midrange, Go-Wide) **mostly unassigned** unless oracle text/keywords are decisive. Those are deck-level, not card-level.

## Prerequisites

- Phase 5 tag pickers and `DeckCard.roles` / `synergies`.
- Phase 4 `Card` fields: `typeLine`, `oracleText`, `keywords`, `colorIdentity`.
- Phase 20 category alias table (reuse; do not duplicate).

## Duration Estimate

**4–5 days.**

| Sub-task | Estimate |
| -------- | -------- |
| Heuristic engine + golden tests | 2 days |
| Suggest-on-add setting + picker prefill | 0.75 day |
| Deck bulk preview UI | 1 day |
| Docs / ADR follow-through | 0.25 day |
| Tests / e2e | 0.5–1 day |

## Architecture & Key Decisions

### Suggestion layers (in order, all local)

**Layer A — Imported categories** (Phase 20). If the card was just imported with mapped tag ids, those win and the heuristic may *add* extra synergies from type line, not replace.

**Layer B — Type line kindred** (high precision):

- `Creature — … Soldier …` → `synergy.soldier` (and Human/Warrior/Knight analogously).
- `Artifact` (non-creature, or Equipment) → `synergy.artifact` / `synergy.equipment` when `typeLine` or keywords include Equipment / `Equip`.
- `Enchantment` → `synergy.enchantment` when the card is primarily an enchantment (not every God).

**Layer C — Keywords** (already on `Card.keywords`):

| Keyword examples | Tag |
| ---------------- | --- |
| Flying, Trample, Menace, Shadow, Horsemanship, Skulk | `role.evasion` |
| Equip | `synergy.equipment` |
| Flash | weak; do not map to Interaction alone |

**Layer D — Oracle-text rules** (regex / phrase list, case-insensitive, must be tested against real cards):

Ship a **small allowlisted rule file** (`lib/tags/oracle-heuristics.ts`), not an open-ended NLP model. Examples of *acceptable* precision:

| Signal | Role |
| ------ | ---- |
| Search library for land / additional land | `role.ramp` |
| Draw a card / draw two cards (not "if you would draw") | `role.card-draw` |
| Counter target spell | `role.counterspell` |
| Destroy all creatures / each creature | `role.board-wipe` |
| Destroy / exile target creature | `role.removal` |
| Target creature gains hexproof / indestructible / protection (self-protection often `role.protection`) | `role.protection` |
| Create … token | `role.token-generator` + `synergy.token` |
| +1/+1 counter | `synergy.plus-one-counter` |
| Sacrifice a creature: | `role.sacrifice-outlet` + `synergy.sacrifice` |
| Return … from graveyard | `role.recursion` / `synergy.graveyard` (be conservative; split by tests) |

**Refuse to guess** (return no tag rather than `role.other` / `role.utility`):

- Win Condition, Finisher, Combo Piece, Voltron, Pillowfort, Utility, Other
- Aggro, Control, Midrange, Go-Wide, Tribal, Spells Matter, Blink, Reanimation unless a later rule is *narrow* and tested (e.g. "return target creature card from your graveyard to the battlefield" → `synergy.reanimation` is OK)

`role.other` must **never** be auto-applied. It is a human bucket.

### Confidence and multi-tag

A card may receive several roles (Board Wipe + Removal is OK if both rules hit; Archidekt themselves collapsed these — we should **not** collapse; our catalog distinguishes them).

Each suggestion carries `source: "type" | "keyword" | "oracle" | "import"` and a short reason for the preview UI.

### Apply policy (locked)

| Situation | Behaviour |
| --------- | --------- |
| New add, tags empty, setting on | Prefill suggestions; user can clear before save if the add sheet allows. If add is one tap, apply suggestions and toast "Tags suggested — edit on the card". |
| New add, user already picked tags | Do not merge heuristics unless they ask |
| Bulk suggest, default | Only cards with `roles.length === 0 && synergies.length === 0` |
| Bulk suggest, "Fill empty" | Union suggestions into empty *category* (empty roles OR empty synergies independently) |
| Bulk suggest, "Replace" | Requires extra confirmation; still skip `owned`? No — tags are not ownership. Skip nothing except user-unchecked rows |
| Existing custom tags | Never delete `custom.*` on Fill; Replace drops them only if the user confirms replace |

### Setting

| Key | Default |
| --- | ------- |
| `tags.suggestOnAdd` | `true` |

Document in `docs/data-model.md`. No new Dexie table required for MVP of this phase.

### Stretch (explicitly not exit criteria)

Cache Scryfall **Oracle Tags** bulk, map `otag:ramp` → `role.ramp`, refresh monthly, exclude from backups (derived). Only if the bulk file is trimmed to a `oracleId → slug[]` subset **and** a new ADR supersedes the "no bulk Scryfall download" line. Do not do this silently in Phase 21.

## File Structure

```text
lib/tags/suggest-tags.ts
lib/tags/oracle-heuristics.ts
lib/tags/kindred-from-type-line.ts
lib/tags/apply-suggestions.ts
lib/hooks/use-suggest-tags.ts
components/deck/suggest-tags-sheet.tsx
components/cards/... add flow / role picker prefill
lib/db/settings keys
tests/unit/tags/suggest-tags.test.ts          — golden cards: Sol Ring, Swords to Plowshares,
                                                Craterhoof Behemoth, Counterspell, Cultivate,
                                                Skullclamp, a vanilla 2/2 Soldier
tests/integration/suggest-tags.test.ts
```

Use real oracle text from existing Scryfall fixtures (`tests/fixtures/scryfall-cards.ts`); add fixtures rather than hitting the network.

## Detailed Task List

- [ ] Implement `suggestTags` with documented rule table and reasons.
- [ ] Golden tests for the cards listed above (assert both hits and deliberate misses).
- [ ] Setting `tags.suggestOnAdd`.
- [ ] Prefill on add; toast if one-tap add.
- [ ] Deck bulk sheet with per-card checkboxes, reasons, apply.
- [ ] Never assign `role.other` automatically.
- [ ] Reuse Phase 20 alias map for import; heuristics do not parse `[brackets]`.
- [ ] Update `docs/product-spec.md` §5.1 from "no automatic classification" to "suggestions, overridable" (ADR-026).
- [ ] E2E: suggest on a deck with untagged cards; tags appear; user can remove one.

## Testing Checklist

- [ ] Cultivate → ramp, not card-draw.
- [ ] Counterspell → counterspell, not generic interaction only (Interaction may also fire; if so, document).
- [ ] Vanilla Soldier creature → `synergy.soldier`, not Aggro.
- [ ] Skullclamp → card-draw (oracle) maybe equipment (type); not Combo Piece.
- [ ] Empty oracle text land (basic) → no roles.
- [ ] Bulk default does not overwrite a card that already has `role.ramp`.
- [ ] Offline: suggestions use cached `Card` rows only.

## Automation & Quality Gates

Same as Phase 19.

## Exit Criteria

- [ ] Adding Sol Ring (or fixture ramp rock) can receive a ramp (and/or artifact) suggestion without a network classifier.
- [ ] Bulk suggest on a deck only fills untagged cards by default and shows why.
- [ ] User can strip any suggested tag; it stays gone.
- [ ] Strategy synergies are not sprayed onto every card.
- [ ] CI green.

## Risks & Mitigations

| Risk | Impact | Mitigation |
| ---- | ------ | ---------- |
| Users expect Archidekt-identical buckets | "Wrong" tags | Document crowd-data vs heuristics in the sheet copy |
| Over-tagging | Noise in Phase 6 charts | Prefer miss over `role.other`; conservative rules |
| Under-tagging new cards | "It doesn't work" | Bulk suggest + on-add; rules are extendable |
| Treating EDHREC synergy as a tag | Nonsense labels | Do not call EDHREC |
| LLM classification | Offline + spec + nondeterminism | Forbidden |
| Oracle-text false positives ("draw" in flavorless reminder) | Bad ramp/draw | Test against fixtures; require land/search collocations for ramp |

## Out of Scope

- Synergy *scoring* or "this card is good in this deck".
- Auto-building or auto-cutting cards.
- Scraping Archidekt/Moxfield/EDHREC.
- Expanding the 26/23 catalogs.
- Scryfall Tagger bulk (stretch only, needs ADR).
- Retroactive overwrite of the user's existing taxonomy.

## Handoff to Next Phase

None scheduled. If tag quality is poor in real use, the next increment is a **reviewed rule-table expansion** or an ADR to opt into a trimmed oracle-tag cache — not an AI phase.
