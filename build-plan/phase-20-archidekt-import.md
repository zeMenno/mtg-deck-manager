# Phase 20 — Archidekt-Dialect Import Into Existing Decks

> **Status: Planned** (after Phase 19). Target ship: **v1.3.0**.

## Agent Handoff Prompt

```
You are implementing Phase 20 (Archidekt-Dialect Import Into Existing Decks)
of the MTG Deck Builder PWA.

Workspace: mtg-deck-manager
Read first:
- build-plan/phase-20-archidekt-import.md (this document — follow every section)
- build-plan/README.md and phase-18-solar-dusk-theme.md (visual system)
- build-plan/phase-10-import-export-recovery.md (existing import pipeline)
- lib/import-export/text-decklist-parser.ts (current Arena/Moxfield parser)
- lib/import-export/import-deck.ts (targetDeckId already exists, UI does not use it)
- docs/decisions.md (ADR-025)

Prerequisites: Phases 0–19 complete. Printing identity from Phase 19 is available.

Goal:
1. Parse Archidekt-style text lines, including quantity, name, (SET), collector
   number, *F*, [categories], and ^label,#hex^ metadata.
2. Resolve SET + collector number to a specific Scryfall printing (not just
   named+set, which ignores collector number today).
3. Paste/import into an *existing* deck with a preview: new / already present /
   unresolved, plus conflict policy and default status for new rows.
4. Map Archidekt categories onto existing role/synergy slugs when names match;
   do not invent a parallel category system.

Constraints:
- This is a dialect of the existing text parser, not a second importer product.
- Do not treat Archidekt as the only "standard". Arena / MTGO / Moxfield lines
  must keep working.
- Never silently replace an existing deck with a pasted list.
- Default new cards into an existing deck as status `consider` (user can choose
  current/add).
- Duplicate detection for existing decks is by oracleId + zone, not printing id.
- Ignore ^color labels^; we have no label entity.
- Solar Dusk UI. Tests ship with the feature.

When done, verify every Exit Criteria item and confirm CI is green.
```

## Overview

Phase 10 already imports **new** decks from Arena/MTGO/Moxfield-ish text. Two gaps remain:

1. **Archidekt's default export is noisier** than that subset. A real line looks like:

   `1x Example Card (set) 123 *F* [Example category] ^Buy,#0066ff^`

   Today's `parseNameWithSet` requires `(SET)` + collector number to be at the **end** of the line. Categories and caret labels make the set parse fail, so the whole remainder can be treated as the card name.

2. **Import into an existing deck is implemented in the service and unused in the product.** `importTextDecklist({ targetDeckId })` and `TextDecklistImport` accept a target id, but the only call site is `/decks/new` with no target. Pasting a list therefore always creates a new deck. There is no preview and no duplicate policy.

This phase extends the parser and wires a **preview-then-apply** flow on the deck page.

## Goal

- Paste an Archidekt (or mixed) list on an existing deck without creating a duplicate deck.
- Keep printings when SET + collector number are present (feeds Phase 19).
- Show what will happen before writing IndexedDB.
- Carry over Archidekt `[categories]` only when they match our catalogs (or explicit custom-tag create, off by default).

## Prerequisites

- Phase 4 — named lookup, collection API.
- Phase 10 — parser, `resolveImportCards`, deck import UI primitives.
- Phase 5 — `DeckService.addCardToDeck` merge rules.
- Phase 19 — printing ids are first-class; collector number resolution is worth doing.

## Duration Estimate

**3–4 days.**

| Sub-task | Estimate |
| -------- | -------- |
| Parser dialect + fixtures | 1 day |
| Printing resolution (set + collector) | 0.75 day |
| Merge preview + policies | 1 day |
| Deck-page UI | 0.75 day |
| Tests | 0.5 day |

## Architecture & Key Decisions

### Archidekt is a dialect, not the standard

There is no single MTG decklist standard. Common families:

| Family | Typical line | Already supported? |
| ------ | ------------ | ------------------ |
| Arena / MTGO | `1 Sol Ring` / `1 Sol Ring (M21) 239` | Yes |
| Moxfield text | `1x Sol Ring (c21) 123` | Partial (set yes, extras no) |
| Archidekt default | `1x Name (set) 123 *F* [Cat] ^Label,#hex^` | **No** (trailing tokens break set parse) |
| Our JSON/CSV | structured | Yes, but always new deck |

Support Archidekt tokens **in the existing parser**. Do not add a file-type picker that rejects Arena lists.

### Line grammar (required)

Strip and capture, left to right then right-side decorations:

1. Quantity: `1`, `1x`, `1 x`.
2. Name (greedy until decorations).
3. `(SET)` — alphanumeric set code.
4. Collector number: `123`, `123a`, `123★` if Scryfall uses it — keep the token Scryfall expects (`collector_number` is a string).
5. Finish flags: `*F*` foil, `*E*` etched (store as foil=true for etched unless a later field exists; we have only `DeckCard.foil`).
6. Zero or more `[Category]` or `[Cat1, Cat2]`.
7. Zero or more `^Label,#rrggbb^` (parse and **discard** for persistence).
8. `*CMDR*` / commander section headers still work.

Extend `ParsedDecklistLine`:

```ts
categories?: string[]; // display names from [brackets], not tag ids yet
```

Unknown trailing junk should not kill the name parse: once name+set+number are taken, ignore the rest if it matches the decoration grammar; if not, record a warning on that line rather than dropping the card.

### Printing resolution

Today `resolveImportCards` keys by `name|setCode` and calls `/cards/named`. Collector number is parsed then **thrown away**.

Required lookup order:

1. If set + collector number: Scryfall `/cards/{set}/{collector_number}` (existing client helper or add `cardBySetCollectorUrl`).
2. Else if set: `/cards/named?exact=&set=` (current).
3. Else: fuzzy named.

Cache by `name|set|collector`. Two Lightning Greaves from different printings in one list must not collapse.

### Import into an existing deck

**Do not default to "dump as CURRENT."** Pasting a 100-card Archidekt export into a 90-card deck would silently create an illegal mess.

Locked defaults:

| Decision | Default | Why |
| -------- | ------- | --- |
| Destination | Current deck, after preview | Feature request |
| New card status | `consider` | User reviews before they are "in" the deck |
| Zone | From list; default mainboard | Commander lines stay commander |
| Oracle already in that zone (any printing, status ≠ cut) | **Skip** | Avoid double Sol Ring; printing switch is Phase 19 |
| Same printing + same zone + same status | Merge quantity (existing add path) | |
| Unresolved names | Listed, not fatal | Phase 10 behaviour |
| Commander already set | Do not overwrite commander | Avoid hijacking the deck |
| Categories | Map to tags only if slug/name match; skip type buckets like "Creatures" | |

**Conflict policies** (radio in preview):

1. **Skip existing** (default) — only add oracles not already in the zone.
2. **Add as CONSIDER even if present** — for "maybe these reprints" workflows; still warn.
3. **Replace printing if SET+number provided** — update `cardId` on the existing row (uses Phase 19 switch helper). Off by default.

Also offer **Create new deck** as an explicit alternative in the same sheet (today's `/decks/new` path).

**Replace entire deck** is *not* this phase. That is closer to Phase 11 restore. If requested later, it must snapshot or confirm as destructively as restore.

### Category mapping (import-time, not AI)

Build a case-insensitive map from seeded tag **names** plus a small alias table:

| Incoming | Tag id |
| -------- | ------ |
| Ramp | `role.ramp` |
| Draw, Card Draw | `role.card-draw` |
| Removal | `role.removal` |
| Board Wipe, Wrath | `role.board-wipe` |
| Soldier | `synergy.soldier` |
| Tokens, Token | `synergy.token` |
| … | … |

Skip Archidekt **type** categories: Land, Creature, Instant, Sorcery, Enchantment, Artifact, Planeswalker, Battle, maybeboard-ish "Maybeboard" if it is a category rather than a section — section headers already set zone.

Do **not** auto-create `custom.*` tags from every unique Archidekt string (users have "Buy", "Goldfish", "Maybe"). Unmapped names appear in the preview as "ignored category: X".

Applying mapped roles/synergies: union onto the new row; do not clear existing tags on skip-existing rows unless policy 3 (replace printing) is on and the user checks "also apply categories".

This is **imported human/Archidekt metadata**, not classifier magic. Phase 21 still needed for untagged lists.

### UI

Add **Import cards** on the deck dashboard (not only `/decks/new`).

Flow:

1. Paste or file.
2. Parse + resolve (progress).
3. Preview summary: `12 new · 80 already in deck · 2 unresolved`.
4. Status selector, conflict policy.
5. Confirm → write.

iPhone: bottom sheet, large textarea, 44px confirm.

### Existing bugs to fix while here

`import-deck.ts` sets `deck.commanderId` to **`Card.id` (printing)**. Validators already look up `deckCard.cardId === deck.commanderId`, which matches implementation and **contradicts** `docs/data-model.md` §2 ("commanderId is DeckCard.id"). **Do not "fix" this to DeckCard.id in this phase** unless you update every validator and the data-model in one ADR. Keep writing printing ids; when setting commander from import, set it from the **created DeckCard's cardId**, and only if the deck has no commander.

Quantity: `deckCards.add` in import does not use `DeckService.addCardToDeck`, so existing-deck import may **duplicate rows** instead of merging. Route existing-deck import through `DeckService` so merge and duplicate warnings apply.

## File Structure

```text
lib/import-export/text-decklist-parser.ts     — Archidekt decorations
lib/import-export/archidekt-categories.ts     — name → tag id map
lib/import-export/resolve-import-cards.ts     — collector number
lib/import-export/import-into-deck.ts         — preview + apply (or extend import-deck.ts)
lib/scryfall/endpoints.ts                     — /cards/{code}/{number}
components/deck/deck-import-into-sheet.tsx    — preview UI
components/deck/text-decklist-import.tsx      — keep for new decks; mention Archidekt
app/decks/[deckId]/...                        — Import cards action
tests/unit/import-export/text-decklist-parser.test.ts  — Archidekt fixture line
tests/unit/import-export/archidekt-categories.test.ts
tests/integration/import-into-existing-deck.test.ts
```

## Detailed Task List

- [ ] Parser fixture exactly matching `1x Example Card (set) 123 *F* [Example category] ^Buy,#0066ff^` (use a real card name in tests, e.g. Sol Ring).
- [ ] Multiple `[Cat]` and comma-separated categories.
- [ ] Arena lines without decorations still parse.
- [ ] Resolve `/cards/set/number` with tests (MSW).
- [ ] Preview model: new / skip / unresolved / mapped tags.
- [ ] Apply via DeckService; default status consider.
- [ ] Do not overwrite commander.
- [ ] Wire deck page + paste; keep `/decks/new` for new decks.
- [ ] Update product copy: "Arena, Moxfield, and Archidekt text".
- [ ] Unit + integration tests for skip-existing by oracleId.

## Testing Checklist

- [ ] Archidekt line does not swallow the name into `[category]`.
- [ ] Collector number selects the matching printing id.
- [ ] Import into existing deck does not create a second deck.
- [ ] Duplicate oracle skipped by default.
- [ ] Unmapped `[Buy]` does not create a custom tag.
- [ ] `^Buy,#0066ff^` ignored.
- [ ] Empty parse still errors clearly.

## Automation & Quality Gates

Same as Phase 19 (`format:check`, `lint`, `typecheck`, unit, integration, e2e, build).

## Exit Criteria

- [ ] User opens a deck → Import cards → pastes an Archidekt export → preview → cards appear as CONSIDER without duplicating oracles already in the deck.
- [ ] SET + collector number round-trips to the intended printing.
- [ ] Arena-style lists still import on `/decks/new`.
- [ ] CI green.

## Risks & Mitigations

| Risk | Impact | Mitigation |
| ---- | ------ | ---------- |
| Treating Archidekt as the only format | Breaks Arena users | Dialect, not a new exclusive parser |
| Import as CURRENT | Inflated illegal decks | Default CONSIDER |
| Category "Creatures" → role.other | Stats pollution | Skip type buckets |
| Custom categories explosion | Tag picker unusable | Ignore unmapped |
| Collector numbers with ★ / ★ | Lookup 404 | Try raw then stripped; leave unresolved |
| Maybeboard included in Archidekt export | Extra cards | Honour Maybeboard headers; warn in preview if many maybeboard lines |

## Out of Scope

- Full Archidekt JSON API / URL scrape.
- Color labels as first-class fields.
- Replace-all-cards-in-deck.
- Full-app backup merge (still replace-only, OPEN-03).
- Auto-classification of untagged cards (Phase 21).
- Exporting *our* decks in Archidekt's caret/category format (nice-to-have later).

## Handoff to Next Phase

Phase 20 can attach mapped categories at import time. Phase 21 must still suggest roles/synergies for cards that arrive as `1 Sol Ring` with no brackets, and must not overwrite tags the user or importer already set.
