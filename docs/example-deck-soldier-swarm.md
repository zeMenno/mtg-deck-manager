# Example Deck — "Soldier Swarm" (Commander, Mardu)

**Status:** LOCKED (Phase 0 output) — this document is the **canonical test fixture** for Phases 3–7 and for the Phase 15 E2E journeys.
**Version:** 1.0
**Date:** 2026-08-18

This is a concrete, end-to-end walkthrough of the product on paper: one Commander deck with real Magic cards, statuses, roles, synergies, an upgrade proposal, and a wishlist. It exists so that later phases can seed identical data and assert identical numbers instead of inventing their own.

---

## 1. Fixture ground rules

Read these before using any number below.

1. **Card ids are placeholders.** The fixture uses readable ids of the form `fixture:card:skullclamp` and `fixture:oracle:skullclamp`. Real Scryfall printing UUIDs and `oracle_id`s are resolved in Phase 4; the seed helper must map fixture ids → real ids at that point, or keep the placeholders for offline unit tests. Placeholder ids are deliberately _not_ UUID-shaped so that a placeholder leaking into production code is obvious.
2. **Prices are illustrative fixture values, not live market prices.** They exist so that totals are deterministic in tests. Never present them to a user, and never assert them against the real Scryfall API.
3. **This fixture is a representative subset, not a legal 100-card deck.** The real "Soldier Swarm" is a 100-card Commander deck; modelling all 100 would make every test slower without testing anything extra. The fixture models **40 cards currently in the deck** plus the pending changes. The counts in §7 are the authoritative expected values.
4. **Colour identity.** The commander is Mardu (W/B/R), so every card in the fixture has a colour identity that is a subset of {W, B, R}. This is intentional — Phase 13's colour-identity check should pass on the base fixture, and Phase 13 should add its own deliberately-illegal variant rather than mutating this one.

---

## 2. Deck header

| Field           | Value                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------- |
| `id`            | `fixture:deck:soldier-swarm`                                                             |
| `name`          | Soldier Swarm                                                                            |
| `format`        | `commander`                                                                              |
| `description`   | Mardu go-wide soldiers. Flood the board, double the attack triggers, close with anthems. |
| Colour identity | Mardu — W / B / R                                                                        |
| `commanderId`   | `fixture:deckcard:isshin`                                                                |
| Archetype       | Aggro / go-wide / token                                                                  |

### Commander

| Card                           | Zone      | Status  | Roles    | Synergies              | Notes                                                                                                                                                                       |
| ------------------------------ | --------- | ------- | -------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Isshin, Two Heavens as One** | commander | CURRENT | Finisher | Combat, Go-Wide, Aggro | Doubles every attack trigger — the reason this deck is Mardu rather than Boros. See [ADR-020](./decisions.md#adr-020--example-deck-commander-is-isshin-two-heavens-as-one). |

---

## 3. CURRENT cards

Twenty representative non-land cards plus the mana base. All have `zone: 'mainboard'`, `status: 'current'`, `quantity: 1` unless stated.

### 3.1 Spells and creatures (20 records)

| #   | Card                        | Roles                       | Synergies                             | Notes                                                              |
| --- | --------------------------- | --------------------------- | ------------------------------------- | ------------------------------------------------------------------ |
| 1   | Adeline, Resplendent Cathar | Token Generator, Finisher   | Human, Knight, Token, Go-Wide, Combat | Makes a token per opponent on every attack; doubled by Isshin.     |
| 2   | Hero of Bladehold           | Token Generator, Finisher   | Soldier, Token, Go-Wide, Combat       | Battle cry + two tokens per attack.                                |
| 3   | Brimaz, King of Oreskos     | Token Generator, Protection | Soldier, Token, Combat                | Cheap, resilient, makes bodies on both offence and defence.        |
| 4   | Myrel, Shield of Argive     | Token Generator, Protection | Soldier, Token, Tribal, Go-Wide       | Soldier payoff and a hard lock on opposing instants during combat. |
| 5   | Harbin, Vanguard Aviator    | Finisher, Evasion           | Soldier, Go-Wide, Combat              | Turns a wide board into an unblockable alpha strike.               |
| 6   | Odric, Lunarch Marshal      | Utility                     | Soldier, Combat, Go-Wide              | Spreads keywords across the whole team.                            |
| 7   | Recruitment Officer         | Card Draw, Utility          | Soldier, Human, Aggro                 | One-drop early, card advantage late.                               |
| 8   | Thalia, Guardian of Thraben | Interaction, Utility        | Soldier, Human, Aggro                 | Taxes the noncreature decks; first strike matters in combat.       |
| 9   | Skyknight Vanguard          | Token Generator             | Knight, Token, Go-Wide, Combat        | Token on each attacking creature's trigger.                        |
| 10  | Mentor of the Meek          | Card Draw                   | Go-Wide, ETB                          | Draw engine for a deck full of small bodies.                       |
| 11  | Welcoming Vampire           | Card Draw                   | Token, ETB, Go-Wide                   | One free card per turn from token creation.                        |
| 12  | Cathars' Crusade            | Anthem, Win Condition       | +1/+1 Counter, Go-Wide, ETB           | Snowballs immediately once tokens start arriving.                  |
| 13  | Anointed Procession         | Token Payoff                | Token, Go-Wide                        | Doubles every token.                                               |
| 14  | Mondrak, Glory Dominus      | Token Payoff, Protection    | Token, Go-Wide, Artifact              | Second token doubler with built-in resilience.                     |
| 15  | Impact Tremors              | Token Payoff, Win Condition | Token, ETB, Go-Wide                   | Converts token creation directly into damage.                      |
| 16  | Bastion of Remembrance      | Token Payoff, Life Gain     | Token, Sacrifice, Death Trigger       | Drain on every creature death, including tokens.                   |
| 17  | Swords to Plowshares        | Removal, Interaction        | Control                               | Best one-mana removal in the format.                               |
| 18  | Anguished Unmaking          | Removal, Interaction        | Control                               | Catch-all answer; the reason black is in the identity.             |
| 19  | Flawless Maneuver           | Protection                  | Protection, Combat                    | Free board-wipe insurance for a go-wide deck.                      |
| 20  | Sol Ring                    | Ramp                        | Artifact                              | Mandatory.                                                         |

### 3.2 Mana base (7 records, 16 cards)

| Card              | Quantity | Roles       | Synergies |
| ----------------- | -------- | ----------- | --------- |
| Command Tower     | 1        | Mana Fixing | —         |
| Sacred Foundry    | 1        | Mana Fixing | —         |
| Battlefield Forge | 1        | Mana Fixing | —         |
| Path of Ancestry  | 1        | Mana Fixing | Tribal    |
| Plains            | 8        | —           | —         |
| Mountain          | 2        | —           | —         |
| Swamp             | 2        | —           | —         |

> `Arcane Signet` and `Talisman of Hierarchy` are part of the real deck but are omitted from the fixture to keep the record count round. Phase 3's seed helper must not add them silently — the counts in §7 assume they are absent.

---

## 4. Proposed changes

### 4.1 ADD — 5 cards

Cards committed to going into the deck at the next update. Status `add`, zone `mainboard`, quantity 1.

| Card                           | Status | Roles                             | Synergies                             | Fixture price (USD) | Replaces             | Notes                                                                                              |
| ------------------------------ | ------ | --------------------------------- | ------------------------------------- | ------------------: | -------------------- | -------------------------------------------------------------------------------------------------- |
| **Skullclamp**                 | ADD    | Card Draw                         | Equipment, Artifact, Token, Sacrifice |                2.50 | Serra Angel          | Turns every 1/1 token into two cards. The single biggest upgrade to the deck's card flow.          |
| **Heroic Reinforcements**      | ADD    | Token Generator, Anthem           | Soldier, Token, Go-Wide, Combat       |                0.75 | Captain of the Watch | Two hasty soldiers plus a team-wide pump for four mana — the cheap version of the card being cut.  |
| **Mardu Ascendancy**           | ADD    | Token Generator, Protection       | Go-Wide, Combat, Death Trigger, Token |                1.25 | —                    | Three tokens per attack, and its sacrifice ability protects the board from the wipe being cut.     |
| **Elesh Norn, Grand Cenobite** | ADD    | Anthem, Board Wipe, Win Condition | Go-Wide, Protection                   |               12.00 | Wrath of God         | A one-sided board wipe that also anthems the team — strictly better than a symmetrical wrath here. |
| **Shared Animosity**           | ADD    | Finisher, Win Condition           | Tribal, Soldier, Go-Wide, Combat      |                4.50 | —                    | Exponential damage once the soldier count is high; the deck's cleanest kill.                       |
|                                |        |                                   | **Total**                             |           **21.00** |                      |                                                                                                    |

### 4.2 CUT — 3 cards

Cards physically in the deck now, targeted for removal. Status `cut`, zone `mainboard`, quantity 1. The reason lives in `DeckCard.notes`.

| Card                     | Status | Roles                   | Synergies               | Fixture price (USD) | Reason for cut                                                                                                                          |
| ------------------------ | ------ | ----------------------- | ----------------------- | ------------------: | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Wrath of God**         | CUT    | Board Wipe, Removal     | Control                 |                8.00 | Anti-synergy. This deck wins by having the widest board; a symmetrical wipe punishes us more than any opponent. Replaced by Elesh Norn. |
| **Captain of the Watch** | CUT    | Token Generator, Anthem | Soldier, Token, Go-Wide |                0.35 | Too slow. Six mana for three tokens arrives after the game has already been decided. Replaced by Heroic Reinforcements at four mana.    |
| **Serra Angel**          | CUT    | Finisher, Evasion       | Combat                  |                0.25 | Filler. A vanilla five-mana beater with no soldier, token, or attack-trigger synergy. Replaced by Skullclamp.                           |

### 4.3 CONSIDER — 5 cards

Shortlisted but uncommitted. Status `consider`, zone `mainboard`, quantity 1. These are **excluded from the projected deck** and survive Apply Changes untouched ([ADR-009](./decisions.md#adr-009--apply-changes-deletes-cut-records)).

| Card                   | Status   | Roles                    | Synergies                 | Fixture price (USD) | Notes                                                                                                                                                                                                         |
| ---------------------- | -------- | ------------------------ | ------------------------- | ------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Coat of Arms**       | CONSIDER | Finisher, Win Condition  | Tribal, Go-Wide, Artifact |               22.00 | Enormous with a wide soldier board, but symmetrical — dangerous against another tribal deck at the table.                                                                                                     |
| **Bitterblossom**      | CONSIDER | Token Generator          | Token, Go-Wide            |               18.00 | Free tokens every turn and perfect Skullclamp fuel, but they are Faeries, so they miss every Soldier payoff.                                                                                                  |
| **Rally the Ranks**    | CONSIDER | Anthem                   | Tribal, Soldier, Go-Wide  |                1.50 | Cheap growing anthem, but only pumps actual Soldiers — most of our tokens qualify, the Knights do not.                                                                                                        |
| **Preeminent Captain** | CONSIDER | Utility, Token Generator | Soldier, Combat, Tribal   |                3.00 | Cheats a Soldier into play on attack, doubled by Isshin. Needs a higher Soldier density than the deck currently runs.                                                                                         |
| **Ballyrush Banneret** | CONSIDER | Cost Reduction           | Soldier, Go-Wide          |                0.30 | ⚠ **Verify before promoting** — this card reduces _Kithkin_ spells, not Soldier spells. Kept on the shortlist as a deliberate example of a candidate whose text must be re-read before it is promoted to ADD. |

---

## 5. Wishlist

The wishlist is **global**, not per-deck ([ADR-017](./decisions.md#adr-017--single-implicit-wishlist-in-v10)). `targetDeckId` is optional — an item may be wanted without being earmarked.

| #   | Card                           | Qty | Priority      | Target deck   | Target role | Fixture price (USD) | Notes                                                                       |
| --- | ------------------------------ | --: | ------------- | ------------- | ----------- | ------------------: | --------------------------------------------------------------------------- |
| 1   | **Skullclamp**                 |   1 | **Essential** | Soldier Swarm | Card Draw   |                2.50 | Already marked ADD on the deck. Buy on the next order.                      |
| 2   | **Elesh Norn, Grand Cenobite** |   1 | **High**      | Soldier Swarm | Anthem      |               12.00 | Already marked ADD. The most expensive item in the current upgrade.         |
| 3   | **Coat of Arms**               |   1 | **Medium**    | Soldier Swarm | Finisher    |               22.00 | Still CONSIDER on the deck — do not buy until it is promoted to ADD.        |
| 4   | **Smothering Tithe**           |   1 | **Low**       | _(none)_      | Ramp        |               25.00 | General white staple. Not tied to a deck; would go wherever it lands first. |

Wishlist total (illustrative): **$61.50**. Items 1 and 2 correspond to ADD cards and demonstrate the wishlist → CONSIDER → ADD promotion path from master plan §58.

---

## 6. Workflow walkthrough

This is the Definition of Done (`product-spec.md` §3) traced through the fixture, and is the narrative Phase 15's E2E-01 … E2E-08 automate.

1. **Open** the app from the Home Screen. Deck list shows _Soldier Swarm — Commander / Mardu / 40 cards_.
2. **Open the deck.** Dashboard shows current 40, projected 42, 5 to add, 3 to cut, upgrade cost $21.00.
3. **Toggle images off.** The card list collapses to compact rows; the preference persists.
4. **Search "soldier".** Scryfall returns Preeminent Captain among others.
5. **Open the card.** Detail sheet shows image, `{2}{W}`, `Creature — Human Soldier`, oracle text, price and its timestamp, and a TCGplayer link.
6. **Mark CONSIDER.** A `DeckCard` is created with `status: 'consider'`.
7. **Assign tags:** roles `Utility`, `Token Generator`; synergies `Soldier`, `Combat`, `Tribal`.
8. **Promote to ADD.** The same record flips to `status: 'add'` — the tags are retained, proving [ADR-002](./decisions.md#adr-002--one-deckcard-model-with-a-status-field).
9. **Mark Serra Angel CUT** and set its `notes` to the cut reason.
10. **Open "Need to Add".** Five (or six, with Preeminent Captain) cards, quantities, per-card and total price, source and fetch timestamp.
11. **Open the TCGplayer link** for Skullclamp; it opens externally.
12. **Apply Changes.** Confirmation lists 5 promotions and 3 removals at $21.00. On confirm: ADDs become CURRENT, CUTs are deleted, the five CONSIDER cards remain.
13. **Save version** "v2 — Token doublers and Skullclamp".
14. **Close and reopen** from the Home Screen. Deck size is 42, ADD and CUT lists are empty, CONSIDER still holds its cards, and v1 → v2 diff shows the five additions and three removals.

---

## 7. Expected values (authoritative test assertions)

Phases 3–7 and 15 must assert exactly these numbers against the seeded fixture. If a phase needs different numbers, it must add a _different_ fixture rather than editing these.

### 7.1 Record counts

| Metric                                                          | Value |
| --------------------------------------------------------------- | ----: |
| `decks` records                                                 |     1 |
| `deckCards` records total                                       |    41 |
| — commander zone                                                |     1 |
| — mainboard, status `current` (spells)                          |    20 |
| — mainboard, status `current` (lands)                           |     7 |
| — mainboard, status `cut`                                       |     3 |
| — mainboard, status `add`                                       |     5 |
| — mainboard, status `consider`                                  |     5 |
| Records with status `current` (1 + 20 + 7)                      |    28 |
| `wishlistItems` records                                         |     4 |
| Distinct `cards` referenced by `deckCards`                      |    41 |
| Distinct `cards` overall (adds Smothering Tithe, wishlist-only) |    42 |
| Seeded `tags` (26 roles + 23 synergies)                         |    49 |

### 7.2 Deck sizes

| Metric                                           | Formula                             |  Value |
| ------------------------------------------------ | ----------------------------------- | -----: |
| Current deck size                                | Σ qty where status ∈ {current, cut} | **40** |
| — commander                                      |                                     |      1 |
| — current spells                                 | 20 × 1                              |     20 |
| — current lands                                  | 1+1+1+1+8+2+2                       |     16 |
| — cut (still physically in the deck)             | 3 × 1                               |      3 |
| ADD quantity                                     |                                     |  **5** |
| CUT quantity                                     |                                     |  **3** |
| CONSIDER quantity (not counted in any deck size) |                                     |  **5** |
| Projected deck size                              | 40 − 3 + 5                          | **42** |

### 7.3 Status counts (`StatusCounts`)

```json
{ "current": 28, "add": 5, "cut": 3, "consider": 5 }
```

Counts are **records**, not quantities: 1 commander + 20 spells + 7 land records = 28 records with status `current`.

### 7.4 Cost summary (`DeckCostSummary`, illustrative prices)

| Metric                   |     Value |
| ------------------------ | --------: |
| Currency                 |     `USD` |
| Upgrade cost (ADD total) | **21.00** |
| Priced ADD cards         |         5 |
| Unpriced ADD cards       |         0 |
| CUT cards                |         3 |
| Value being removed      |      8.60 |

**Required negative case.** With the price for _Mardu Ascendancy_ deliberately absent, the summary must read `total: 19.75`, `pricedCards: 4`, `unpricedCards: 1` — and must **never** render `$0.00` for that card ([ADR-005](./decisions.md#adr-005--pricing-provider-abstraction-scryfall-first), product spec §6.4).

### 7.5 After Apply Changes

| Metric                                |             Value |
| ------------------------------------- | ----------------: |
| `ApplyChangesResult.promotedCount`    |                 5 |
| `ApplyChangesResult.removedCount`     |                 3 |
| `deckCards` records remaining         |                38 |
| Records with status `current`         |                33 |
| Records with status `add`             |                 0 |
| Records with status `cut`             |                 0 |
| Records with status `consider`        | **5** (untouched) |
| Current deck size                     |            **42** |
| `replacesDeckCardId` values remaining |   0 (all cleared) |

Arithmetic check: 41 records − 3 deleted CUTs = 38, of which 33 are `current` (28 + 5 promoted) and 5 are `consider`; deck size 40 − 3 + 5 = 42, which equals the pre-apply projected size. **`projectedSize` before apply must equal `currentSize` after apply** — this identity is the single most valuable assertion in the Phase 7 test suite.

---

## 8. Machine-readable fixture skeleton

Phase 3's `tests/helpers/seed-test-deck.ts` should produce this shape. Abbreviated — the `current` array is truncated for readability, but the seed helper must include all 28 current records listed in §3.

```jsonc
{
  "deck": {
    "id": "fixture:deck:soldier-swarm",
    "name": "Soldier Swarm",
    "format": "commander",
    "description": "Mardu go-wide soldiers.",
    "commanderId": "fixture:deckcard:isshin",
    "createdAt": "2026-08-18T09:00:00.000Z",
    "updatedAt": "2026-08-18T09:00:00.000Z",
  },
  "deckCards": [
    {
      "id": "fixture:deckcard:isshin",
      "deckId": "fixture:deck:soldier-swarm",
      "cardId": "fixture:card:isshin-two-heavens-as-one",
      "quantity": 1,
      "zone": "commander",
      "status": "current",
      "roles": ["role.finisher"],
      "synergies": ["synergy.combat", "synergy.go-wide", "synergy.aggro"],
      "addedAt": "2026-08-18T09:00:00.000Z",
      "updatedAt": "2026-08-18T09:00:00.000Z",
    },
    {
      "id": "fixture:deckcard:adeline",
      "deckId": "fixture:deck:soldier-swarm",
      "cardId": "fixture:card:adeline-resplendent-cathar",
      "quantity": 1,
      "zone": "mainboard",
      "status": "current",
      "roles": ["role.token-generator", "role.finisher"],
      "synergies": [
        "synergy.human",
        "synergy.knight",
        "synergy.token",
        "synergy.go-wide",
        "synergy.combat",
      ],
      "addedAt": "2026-08-18T09:00:00.000Z",
      "updatedAt": "2026-08-18T09:00:00.000Z",
    },
    // ... 26 more `current` records (see §3.1 and §3.2) ...
    {
      "id": "fixture:deckcard:skullclamp",
      "deckId": "fixture:deck:soldier-swarm",
      "cardId": "fixture:card:skullclamp",
      "quantity": 1,
      "zone": "mainboard",
      "status": "add",
      "roles": ["role.card-draw"],
      "synergies": [
        "synergy.equipment",
        "synergy.artifact",
        "synergy.token",
        "synergy.sacrifice",
      ],
      "replacesDeckCardId": "fixture:deckcard:serra-angel",
      "addedAt": "2026-08-18T09:00:00.000Z",
      "updatedAt": "2026-08-18T09:00:00.000Z",
    },
    {
      "id": "fixture:deckcard:wrath-of-god",
      "deckId": "fixture:deck:soldier-swarm",
      "cardId": "fixture:card:wrath-of-god",
      "quantity": 1,
      "zone": "mainboard",
      "status": "cut",
      "notes": "Anti-synergy: symmetrical wipe punishes our own go-wide board.",
      "roles": ["role.board-wipe", "role.removal"],
      "synergies": ["synergy.control"],
      "addedAt": "2026-08-18T09:00:00.000Z",
      "updatedAt": "2026-08-18T09:00:00.000Z",
    },
    {
      "id": "fixture:deckcard:coat-of-arms",
      "deckId": "fixture:deck:soldier-swarm",
      "cardId": "fixture:card:coat-of-arms",
      "quantity": 1,
      "zone": "mainboard",
      "status": "consider",
      "notes": "Symmetrical — risky against another tribal deck.",
      "roles": ["role.finisher", "role.win-condition"],
      "synergies": ["synergy.tribal", "synergy.go-wide", "synergy.artifact"],
      "addedAt": "2026-08-18T09:00:00.000Z",
      "updatedAt": "2026-08-18T09:00:00.000Z",
    },
  ],
  "wishlistItems": [
    {
      "id": "fixture:wish:skullclamp",
      "cardId": "fixture:card:skullclamp",
      "quantity": 1,
      "priority": "essential",
      "targetDeckId": "fixture:deck:soldier-swarm",
      "targetRole": "role.card-draw",
      "addedAt": "2026-08-18T09:00:00.000Z",
      "updatedAt": "2026-08-18T09:00:00.000Z",
    },
    {
      "id": "fixture:wish:elesh-norn",
      "cardId": "fixture:card:elesh-norn-grand-cenobite",
      "quantity": 1,
      "priority": "high",
      "targetDeckId": "fixture:deck:soldier-swarm",
      "targetRole": "role.anthem",
      "addedAt": "2026-08-18T09:00:00.000Z",
      "updatedAt": "2026-08-18T09:00:00.000Z",
    },
    {
      "id": "fixture:wish:coat-of-arms",
      "cardId": "fixture:card:coat-of-arms",
      "quantity": 1,
      "priority": "medium",
      "targetDeckId": "fixture:deck:soldier-swarm",
      "targetRole": "role.finisher",
      "addedAt": "2026-08-18T09:00:00.000Z",
      "updatedAt": "2026-08-18T09:00:00.000Z",
    },
    {
      "id": "fixture:wish:smothering-tithe",
      "cardId": "fixture:card:smothering-tithe",
      "quantity": 1,
      "priority": "low",
      "targetRole": "role.ramp",
      "addedAt": "2026-08-18T09:00:00.000Z",
      "updatedAt": "2026-08-18T09:00:00.000Z",
    },
  ],
}
```

---

## 9. How each phase uses this fixture

| Phase               | Use                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 3 — Local database  | `seed-test-deck.ts` writes this deck; CRUD and export/import round-trip tests assert §7.1.                       |
| 4 — Scryfall        | Map fixture card names → real Scryfall printings; MSW fixtures cover every card named here.                      |
| 5 — Deck management | Deck list, card list, status toggles, and tag pickers are demoed against this deck.                              |
| 6 — Statistics      | Mana curve, type/colour/role/synergy distributions computed over §3; status counts must match §7.3.              |
| 7 — Changes         | Projected-deck maths and Apply Changes assert §7.2 and §7.5, including the projected-equals-post-apply identity. |
| 8 — Pricing         | Deck value and upgrade cost assert §7.4, including the mandatory unpriced-card case.                             |
| 10 — Import/export  | Export this deck, clear the database, re-import, and assert §7.1 is byte-equivalent.                             |
| 11 — Versions       | Snapshot before and after Apply Changes; the diff must show the 5 additions and 3 removals.                      |
| 12 — Wishlist       | §5 seeds the wishlist; the promotion path is Skullclamp wishlist → CONSIDER → ADD.                               |
| 13 — Validation     | Base fixture passes colour identity and singleton checks; deliberately-illegal variants are Phase 13's own.      |
| 15 — Testing        | E2E-01 … E2E-10 run against this deck.                                                                           |
