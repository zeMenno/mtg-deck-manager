# Architecture & Product Decision Log

**Status:** Phase 0 output — decisions below are **LOCKED** unless explicitly marked `[OPEN]`.
**Date:** 2026-08-18

Format: each record states Context → Decision → Consequences → Alternatives rejected. Later phases may append new ADRs (ADR-021+) but must not silently contradict an accepted one. To reverse a decision, add a new ADR that supersedes it by number and update the status of the old one.

| #                                                                          | Decision                                        | Status   | Phase most affected |
| -------------------------------------------------------------------------- | ----------------------------------------------- | -------- | ------------------- |
| [ADR-001](#adr-001--local-first-storage-with-no-user-account)              | Local-first, no account                         | Accepted | 3                   |
| [ADR-002](#adr-002--one-deckcard-model-with-a-status-field)                | Single `DeckCard` model with status             | Accepted | 5, 7                |
| [ADR-003](#adr-003--oracleid-vs-printing-id)                               | `oracleId` vs printing id                       | Accepted | 4                   |
| [ADR-004](#adr-004--commander-first-mvp)                                   | Commander-first MVP                             | Accepted | 13                  |
| [ADR-005](#adr-005--pricing-provider-abstraction-scryfall-first)           | Pricing provider abstraction, Scryfall first    | Accepted | 8                   |
| [ADR-006](#adr-006--tcgplayer-is-links-only)                               | TCGplayer = links only                          | Accepted | 8                   |
| [ADR-007](#adr-007--indexeddb-via-dexie-with-versioned-migrations-from-v1) | Dexie + migrations from v1                      | Accepted | 3                   |
| [ADR-008](#adr-008--roles-and-synergies-live-on-deckcard-as-tag-slugs)     | Tags on `DeckCard`, stored as slugs             | Accepted | 3, 5                |
| [ADR-009](#adr-009--apply-changes-deletes-cut-records)                     | Apply Changes deletes CUT records               | Accepted | 7                   |
| [ADR-010](#adr-010--tweakcn-neo-brutalism-is-the-only-design-system)       | Neo Brutalism, undiluted                        | Superseded by ADR-023 | 1, 14       |
| [ADR-011](#adr-011--official-automation-toolchain)                         | Vitest + TestCafe + Knip + MSW + GitHub Actions | Accepted | all                 |
| [ADR-012](#adr-012--testcafe-instead-of-playwright-for-e2e)                | TestCafe over Playwright                        | Accepted | 5, 15               |
| [ADR-013](#adr-013--app-name-mtg-deck-builder)                             | App name: MTG Deck Builder                      | Accepted | 1                   |
| [ADR-014](#adr-014--role-catalog-is-26-entries-evasion-added)              | Role catalog = 26 (added Evasion)               | Accepted | 5                   |
| [ADR-015](#adr-015--default-currency-is-usd)                               | Default currency USD                            | Accepted | 8                   |
| [ADR-016](#adr-016--iso-8601-strings-for-all-timestamps)                   | ISO 8601 strings for timestamps                 | Accepted | 3                   |
| [ADR-017](#adr-017--single-implicit-wishlist-in-v10)                       | Single implicit wishlist                        | Accepted | 12                  |
| [ADR-018](#adr-018--replacement-links-are-stored-one-way-add--cut)         | Replacement link stored ADD → CUT only          | Accepted | 7                   |
| [ADR-019](#adr-019--separate-warning-category-from-warning-severity)       | Warning category ≠ severity                     | Accepted | 6, 13               |
| [ADR-020](#adr-020--example-deck-commander-is-isshin-two-heavens-as-one)   | Example commander = Isshin                      | Accepted | 0                   |
| [ADR-021](#adr-021--scryfall-symbology-over-icon-font)                     | Scryfall symbology cache over icon fonts        | Accepted | 17                  |
| [ADR-022](#adr-022--warn-not-block-on-illegal-adds)                        | Warn, never block illegal card adds             | Accepted | 17                  |
| [ADR-023](#adr-023--solar-dusk-supersedes-neo-brutalism-and-dark-is-the-default) | Solar Dusk, deterministic dark default     | Accepted | 18                  |

Phase 16 operational decisions (not ADR-numbered): [`docs/decisions/error-tracking.md`](./decisions/error-tracking.md), [`docs/decisions/analytics.md`](./decisions/analytics.md), [`docs/decisions/csp.md`](./decisions/csp.md).

---

## ADR-001 — Local-first storage with no user account

**Context.** The core value of the app is one person's accumulated deck-building work. Decks are small (a few hundred records per deck at most). A backend database, auth system, and sync engine would be the majority of the engineering effort while adding nothing to the primary workflow.

**Decision.** IndexedDB on the device is the **source of truth** for all deck data. There is no login, no server-side deck storage, and no cloud sync in the MVP. Portability is provided by first-class export/import. Network access is used only for Scryfall card metadata, images, and reference prices.

**Consequences.**

- The user must never lose a deck because a network request failed. Every write path is local and synchronous-feeling.
- iOS Home Screen web apps have **separate storage** from Safari browsing. Onboarding (Phase 2) must tell the user to install to the Home Screen _before_ building their first deck, and must offer export/import as the migration path if they did not.
- Backups are mandatory, not optional (see §8 of the product spec). "Last backup: Never" must be visible in Settings → Data.
- A future cloud-sync feature must slot in below the repository layer, not be bolted onto the UI.

**Rejected.** Cloud-first with local cache (needs auth + backend for day one); `localStorage` (synchronous, size-limited, string-only).

---

## ADR-002 — One `DeckCard` model with a status field

**Context.** The user needs four views — what's in the deck, what's going in, what's coming out, what's being weighed up. The naive design is four lists.

**Decision.** Exactly one `DeckCard` record per card-in-deck-per-zone, carrying `status: 'current' | 'add' | 'cut' | 'consider'`. Every view is a **filter** over that one collection. There are no `addedCards` / `cutCards` / `considerList` tables.

**Consequences.**

- Projected deck is arithmetic, not reconciliation: `CURRENT + ADD − CUT`.
- Roles, synergies, notes, and ownership survive a status change automatically — promoting CONSIDER → ADD loses nothing.
- Status changes are single-field updates, which makes bulk actions and undo cheap.
- Phases 5–7 must resist any pressure to introduce a parallel table for "the shopping list".

**Rejected.** Separate tables per status (duplicate data, guaranteed to drift); a `Change` entity layered over a static deck (more moving parts, no user-visible benefit).

---

## ADR-003 — `oracleId` vs printing id

**Context.** "Sol Ring" is one card and roughly a hundred printings. Prices, images, set codes, collector numbers, and TCGplayer product links all differ per printing; legality, oracle text, and Commander's singleton rule are per oracle card.

**Decision.** `Card.id` is the Scryfall **printing** UUID and is the primary key of the local `cards` table. `Card.oracleId` is the Scryfall `oracle_id`. `DeckCard.cardId`, `CardPrice.cardId`, and `WishlistItem.cardId` all reference the **printing**.

**Consequences.**

- Prices, images, and purchase links are unambiguous.
- Duplicate detection and Commander singleton validation (Phase 13) must group by `oracleId`, not `cardId`.
- "Switch printing" (post-MVP nicety) becomes a field swap on `DeckCard.cardId` plus a `cards` upsert.
- Search results default to Scryfall's preferred printing for a name unless the user picks another.

**Rejected.** Keying decks on `oracleId` (loses price/image fidelity); storing both and letting each feature choose (guaranteed inconsistency).

---

## ADR-004 — Commander-first MVP

**Context.** The whole upgrade-tracking workflow was conceived around a 100-card Commander deck. Supporting six formats properly means six sets of legality rules.

**Decision.** Commander is the only format with real validation in v1.0. `DeckFormat` enumerates `commander | standard | modern | pioneer | legacy | vintage | pauper | other`, but non-Commander formats get a no-op `FormatRules` implementation that emits no legality warnings.

**Consequences.**

- Default deck size target is 100 including the commander; the commander zone is required for a valid Commander deck.
- Singleton and colour-identity checks are Commander-specific and live behind `FormatRules`, so adding a format later is an implementation, not a refactor.
- The UI must not imply that a Standard deck has been validated.

**Rejected.** Format-agnostic MVP (no useful checks at all); all-formats validation (weeks of rules work for one user who plays Commander).

---

## ADR-005 — Pricing provider abstraction, Scryfall first

**Context.** TCGplayer API access is restricted for new applications. Cardmarket, Card Kingdom, and others each have their own terms. Prices must not become a single point of failure for the entire upgrade workflow.

**Decision.** All price access goes through a `PricingProvider` interface. The only v1.0 implementation is `ScryfallPricingProvider`, which reads the `prices` object already present on the Scryfall card payload fetched for metadata. Snapshots are cached in `cardPrices` with `source` and `fetchedAt`.

**Consequences.**

- Zero additional API keys, zero additional rate-limit pressure, no server-side proxy needed for pricing in v1.0.
- Swapping or adding a provider later touches one file plus a settings toggle.
- Scryfall exposes a single reference price rather than a low/market spread, so `CardPrice.market` mirrors `normal` and `low` is left undefined. The UI must not imply a spread exists.
- Deck valuation reads cached snapshots; it never blocks on the network.

**Rejected.** Hardcoding Scryfall throughout (locks us in); waiting for TCGplayer API approval (blocks the MVP indefinitely).

---

## ADR-006 — TCGplayer is links only

**Context.** The user buys cards on TCGplayer, so purchase links have real value — but an API dependency does not.

**Decision.** Render `View on TCGplayer ↗` using the `tcgplayer_uri` Scryfall already provides. Open externally. No authenticated API, no credentials in the client, and **no browser-side scraping** (CORS, bot protection, and maintenance make it a dead end).

**Consequences.** The app is fully functional when a card has no TCGplayer link. If authenticated access is ever obtained, it must be implemented as a Vercel server route so no secret reaches the browser.

---

## ADR-007 — IndexedDB via Dexie, with versioned migrations from v1

**Context.** Raw IndexedDB is verbose and error-prone. A schema that cannot be migrated will eventually force data loss on a user whose only copy is on their phone.

**Decision.** Dexie wraps IndexedDB. The version-1 schema is defined in [`data-model.md`](./data-model.md) §13 and, **once shipped, is never edited in place** — every subsequent change is a new `this.version(n).stores(...).upgrade(...)` block with a test. Access is layered UI → hooks → services → repositories → Dexie; no component touches `db.<table>`.

**Consequences.**

- Migration tests are required from Phase 3 (a v1→v2 no-op stub proves the harness works before it is needed for real).
- A failed migration must surface "export a backup before continuing", never wipe and recreate.
- The repository layer is the future seam for cloud sync.

---

## ADR-008 — Roles and synergies live on `DeckCard`, as tag slugs

**Context.** The same card plays different roles in different decks — Skullclamp is Card Draw in a token deck and a Combo Piece elsewhere. Separately, tag references stored as display strings break the moment a tag is renamed; stored as random UUIDs they make exports unreadable and re-seeding on a new device orphans them.

**Decision.** `roles` and `synergies` are `string[]` on `DeckCard` (not on `Card`), holding **stable slug ids**: `role.card-draw`, `synergy.go-wide`, and `custom.<uuid>` for user-created tags. `Tag.id` is that slug. Display names are user-renameable without touching any deck card.

**Consequences.**

- Backups and CSV exports are human-readable.
- A fresh install re-seeds the same 26 + 23 slugs, so an imported backup reconnects to real tags automatically.
- `role.protection` and `synergy.protection` coexist with the same display name; pickers are scoped by category so the user never sees a duplicate.
- Distribution widgets group by slug and resolve the label at render time.

---

## ADR-009 — Apply Changes deletes CUT records

**Context.** After an upgrade is applied, the cut cards are physically out of the deck. Keeping them would pollute every list and every count.

**Decision.** In one atomic transaction: ADD → CURRENT, CUT records **deleted**, CONSIDER left untouched, dangling `replacesDeckCardId` links cleared, `deck.updatedAt` bumped. The user confirms beforehand (with counts and cost), gets an undo affordance afterwards, and is _prompted_ — not forced — to save a version.

**Consequences.**

- History is preserved by deck **versions**, which is what they are for. Applying changes without having saved a version loses the cut cards' tags and notes, so the pre-apply confirmation should nudge toward saving one.
- CONSIDER surviving the apply is intentional: the shortlist outlives one upgrade cycle.

**Rejected.** Soft-delete with an `archived` flag (every query grows a filter, for history that versions already provide).

---

## ADR-010 — tweakcn Neo Brutalism is the only design system

**Status:** Superseded by ADR-023. Retained as launch-era history.

**Context.** shadcn/ui defaults are rounded and soft. Applying a theme on top of those defaults typically produces a diluted hybrid.

**Decision.** Import <https://tweakcn.com/r/themes/neo-brutalism.json> variables into `globals.css` as the single token source. Force `--radius: 0rem`. DM Sans (sans) and Space Mono (mono). Hard black borders and hard offset shadows. No second colour system.

**Consequences.**

- Phase 1 must audit shadcn `Button` and `Card` after `init` and strip residual rounding and blurred shadows.
- Semantic status tokens (`--status-add`, `--status-cut`, …) are derived from theme variables, not from new raw hex values.
- Colour never carries status alone — every badge has a text label and an icon (accessibility, master plan §40).
- Phase 14 re-audits all surfaces against these rules.

---

## ADR-011 — Official automation toolchain

**Context.** Sixteen implementation phases executed by independent agents will regress each other unless CI blocks broken builds.

**Decision.** The official toolchain, per [`build-plan/automation-strategy.md`](../build-plan/automation-strategy.md):

| Tool                        | Purpose                                                              | Introduced                    |
| --------------------------- | -------------------------------------------------------------------- | ----------------------------- |
| TypeScript `strict`         | Type safety                                                          | Phase 1                       |
| ESLint (`--max-warnings 0`) | Lint                                                                 | Phase 1                       |
| Prettier (`--check` in CI)  | Formatting                                                           | Phase 1                       |
| Husky + lint-staged         | Pre-commit gate                                                      | Phase 1                       |
| Knip                        | Unused files/exports/deps — report-only until Phase 15, then failing | Phase 1                       |
| **Vitest**                  | Unit + integration tests                                             | Phase 3                       |
| fake-indexeddb              | IndexedDB in Node tests                                              | Phase 3                       |
| **MSW**                     | Mock Scryfall + pricing                                              | Phase 4                       |
| @testing-library/react      | Selective component tests                                            | Phase 5                       |
| **TestCafe**                | E2E in real browsers                                                 | Phase 5 smoke → Phase 15 full |
| **GitHub Actions**          | CI                                                                   | Phase 1                       |

**Rules.** Tests ship with the feature, never deferred to Phase 15. CI must be green before the next phase starts. No test may contact the real Scryfall API. Coverage thresholds are enforced from Phase 15 (`lib/format/**` and `lib/db/migrations/**` at 100%, `lib/import-export/**` at 90%, `lib/deck/**` and `lib/pricing/**` at 80%, `lib/**` overall at 70%).

**Phase 0 note.** There is **no automated check to run in Phase 0** — this phase produces markdown only, and no `package.json`, linter, or test runner exists yet. The first executable gate is Phase 1's `npm run verify`.

---

## ADR-012 — TestCafe instead of Playwright for E2E

**Context.** Master plan §42 names Playwright; `build-plan/automation-strategy.md` specifies TestCafe. This is a direct conflict that had to be resolved in Phase 0.

**Decision.** **TestCafe.** It runs in real browsers without WebDriver, handles mobile viewport profiles cleanly (`chrome:headless:width=390;height=844` matches the iPhone reference viewport), and suits a PWA that must behave in Safari-like environments. Config in `.testcaferc.js`, specs in `tests/e2e/**/*.test.ts`. The automation strategy is the more specific and more recent document, so it wins.

**Consequences.** Master plan §42's "Use Playwright" is superseded by this ADR. If TestCafe turns out to block a required journey (for example service-worker update testing), Phase 15 may switch to Playwright — but only by appending a superseding ADR here.

---

## ADR-013 — App name: MTG Deck Builder

**Context.** The phase brief says "MTG Deck Builder (or confirm with user)". No user preference was supplied, and Phase 1 needs a name for `package.json`, the PWA manifest, and the page title.

**Decision.** Product name **MTG Deck Builder**; PWA `short_name` **Deck Builder** (fits under an iPhone Home Screen icon without truncation); repository stays `mtg-deck-manager`; suggested production host `mtg-deck-builder.vercel.app` until a custom domain is chosen.

**Consequences.** Renaming later touches the manifest, the layout metadata, the README, and the app icon. It is cheap now and annoying after Phase 2. Flagged below as `[OPEN-01]` for a one-line confirmation, with this name as the working default.

---

## ADR-014 — Role catalog is 26 entries (Evasion added)

**Context.** Master plan §12 lists **25** roles. The Phase 0 brief requires **26**. One of the two is wrong and the seed data must be exact.

**Decision.** Keep all 25 from §12 verbatim and add **Evasion** as the 26th, positioned before `Other` (which always sorts last). Evasion (flying, menace, unblockable, trample) is a genuine functional gap in the original list and is directly relevant to a go-wide Commander deck that needs to close games through a board stall.

**Consequences.** The seeded catalog in [`product-spec.md`](./product-spec.md) §5.2 is authoritative for Phase 3's `default-tags.ts`. Any test that asserts a role count expects **26**.

---

## ADR-015 — Default currency is USD

**Context.** The master plan's mockups use `€`; Scryfall exposes both `prices.usd` and `prices.eur`; TCGplayer — the linked storefront — is USD.

**Decision.** Default **USD**, with EUR selectable in Settings (`settings.currency`). Totals never mix currencies; a card without a price in the selected currency is counted as _unpriced_, never as zero.

**Consequences.** The `€` figures in the master plan's illustrations are examples, not a requirement. Switching currency in Settings marks cached prices for refresh rather than converting them — no FX conversion is performed anywhere in the app.

---

## ADR-016 — ISO 8601 strings for all timestamps

**Context.** Timestamps cross IndexedDB, JSON exports, and React state.

**Decision.** Every timestamp field is an ISO 8601 UTC string (`new Date().toISOString()`). No `Date` objects and no epoch numbers are persisted.

**Consequences.** Structured-clone safe, lexicographically sortable, readable in a backup file, and trivially comparable in tests. Display formatting ("Updated 3h ago") happens at render time only.

---

## ADR-017 — Single implicit wishlist in v1.0

**Context.** Master plan §28 lists both `wishlists` and `wishlistItems` tables; Phase 3's schema lists only `wishlistItems`. Nothing in the MVP UI offers multiple named wishlists.

**Decision.** v1.0 has one implicit global wishlist. Only the `wishlistItems` table exists. `WishlistItem.wishlistId` is declared as optional and left unset, reserved for a future multi-wishlist feature.

**Consequences.** Adding named wishlists later is a Dexie migration that backfills `wishlistId` to a default wishlist id — no data loss, no reshaping of items.

---

## ADR-018 — Replacement links are stored one way (ADD → CUT)

**Context.** Phase 7's document sketches both `replacementDeckCardId` (on the CUT card) and `replacesDeckCardId` (on the ADD card). Storing both invites the two sides to disagree.

**Decision.** Store **one** field, `replacesDeckCardId`, on the **ADD** card, pointing at the CUT card it replaces. The reverse direction is derived by lookup and never persisted. It may only be set when the source card's status is `add` and the target's is `cut`, in the same deck.

**Consequences.** Apply Changes clears any `replacesDeckCardId` that pointed at a now-deleted CUT record. The "Cards to Cut" screen finds a card's replacement with one indexed query. Phase 7 must not introduce `replacementDeckCardId`.

---

## ADR-019 — Separate warning _category_ from warning _severity_

**Context.** Phase 6 sketches `WarningSeverity = 'legality' | 'warning' | 'recommendation'`; Phase 13 sketches `WarningSeverity = 'error' | 'warn' | 'info' | 'success'`. These are two different axes wearing the same name, and master plan §35 insists that recommendations must never be presented as rules.

**Decision.** Two orthogonal fields on one shared `DeckWarning` type: `category: 'legality' | 'recommendation' | 'integrity'` ("is this a rule or an opinion?") and `severity: 'error' | 'warn' | 'info' | 'success'` ("how loudly do we say it?"). Both Phase 6 and Phase 13 consume this single type.

**Consequences.** "31 lands" is `{ category: 'recommendation', severity: 'warn' }`; "102 cards in a Commander deck" is `{ category: 'legality', severity: 'error' }`. The UI groups by category first so the user can always tell a rule from advice.

---

## ADR-020 — Example deck commander is Isshin, Two Heavens as One

**Context.** The Phase 0 brief asks for a **Mardu (R/W/B)** Soldier deck and suggests _Iroas, God of Victory_ (Boros, R/W) or _Adeline, Resplendent Cathar_ (mono-white) as the commander. Neither is Mardu, so the colour requirement and the suggested commanders contradict each other.

**Decision.** The colour requirement wins. The example deck's commander is **Isshin, Two Heavens as One** — a genuine Mardu legend whose "if an attacking creature would cause a trigger, it triggers an additional time" text is a natural fit for a go-wide Soldier deck. _Adeline, Resplendent Cathar_ is retained in the list as a CURRENT mainboard card.

**Consequences.** The fixture exercises a three-colour identity, which is a better test of colour-identity validation (Phase 13) than a two-colour or mono-colour commander would be.

---

## ADR-021 — Scryfall symbology over icon font

**Context.** Mana costs were rendered as raw `{2}{W}{U}` strings. Bundling `mana-font` would add ~80 KB and drift from Scryfall’s symbol set.

**Decision.** Fetch `/symbology` once, cache in Dexie `symbols` (schema v5), render via `<img>` to `svgs.scryfall.io`, with letter-pip / raw-text degradation. Exclude `symbols` from backups.

**Consequences.** First online boot hydrates the cache; offline uses Dexie + SW CacheFirst for `*.scryfall.io`. Oracle-text inline symbols remain out of scope.

---

## ADR-022 — Warn, not block, on illegal adds

**Context.** Users may proxy / kitchen-table banned cards. Hard-blocking adds would fight the product’s personal-use model.

**Decision.** When adding to a deck whose format marks the card `banned` / `restricted` / `not_legal`, show a confirmation (“Add anyway”) and a warning toast after confirm. Skip when format is `other` or legality is unknown.

**Consequences.** Deck-level Phase 13 validation still surfaces legality errors; add flow never silently refuses.

---

## ADR-023 — Solar Dusk supersedes Neo Brutalism and dark is the default

**Context.** The launch theme's square, hard-offset treatment made dense mobile
surfaces visually noisy and difficult to extend consistently. Phase 18 requires
a complete visual-system migration while preserving every route, interaction,
data model, and offline behavior.

**Decision.** The build-time payload at
<https://tweakcn.com/r/themes/solar-dusk.json> is authoritative for the base
light and dark colors, `0.3rem` radius, typography, spacing, tracking, and
blurred elevation scale copied into `app/globals.css`. The application never
fetches that payload at runtime. Oxanium, Fira Code, and Merriweather are loaded
through `next/font`.

Dark is deterministic: the server response contains the `dark` class and
`next-themes` uses `defaultTheme="dark"`, does not follow the operating system,
and persists only explicit Dark or Light choices under
`mtg-deck-builder-theme`.

Application meanings that Solar Dusk does not define—CURRENT, ADD, CUT,
CONSIDER, COMMANDER, warnings, wishlist priorities, legality, and MTG mana
colors—remain labelled semantic extensions. Their per-mode foreground and
background pairs are centralized as CSS tokens; color is never their only cue.

**Consequences.**

- ADR-010 is superseded, not deleted. Phases 0–17 remain accurate history.
- Tokens, provider, primitives, feature surfaces, PWA metadata, and generated
  icons form one rollback boundary; a partial rollback would recreate a hybrid.
- Shared primitives own radius, border, elevation, focus, disabled, and touch
  behavior. `shadow-brutal*`, hard-offset shadows, press translations, and
  zero-radius overrides must not return.
- The static manifest and splash chrome use Solar Dusk's dark background
  (`#1c1917`); explicit light mode changes content, while static PWA chrome
  continues to represent the product default.
- Theme preference is presentation-only local storage and is excluded from
  IndexedDB, backups, and imports.

**Rejected.** Following the system theme (non-deterministic first run);
token-only recoloring (leaves a hybrid); runtime registry fetches (offline and
availability risk); exporting appearance as domain data.

---

## Open questions

These are the only unresolved items. Each has a **documented working default** so no phase is blocked waiting for an answer; if the user disagrees, changing them now is cheap.

### `[OPEN-01]` Product name confirmation

**Default in force:** "MTG Deck Builder" / short name "Deck Builder" (ADR-013).
**Why it matters:** baked into the PWA manifest and Home Screen icon label in Phase 2.
**Cost to change later:** low before Phase 2, moderate after (manifest + icon + installed-app label).

### `[OPEN-02]` Custom domain

**Default in force:** the Vercel-generated production URL; no custom domain.
**Why it matters:** master plan §45 recommends a custom domain before serious iPhone use, because reinstalling the Home Screen app after a domain change starts from empty storage.
**Cost to change later:** high after real data exists — the user would have to export, reinstall from the new domain, and import.
**Recommendation:** decide before Phase 16.

### `[OPEN-03]` Backup import mode — replace vs merge

**Default in force:** **replace** (import wipes local data and restores the backup), with an explicit confirmation.
**Why it matters:** merge semantics need conflict rules (same deck id, different content) that are real design work.
**Cost to change later:** low — merge can be added as a second button in Phase 10 or later.
**Recommendation:** ship replace-only in v1.0.

### `[OPEN-04]` Error tracking and analytics

**Default in force:** **none** — no third-party analytics, no error-reporting SDK, no telemetry. A single-user local-first app has no analytics need, and the privacy story stays trivial.
**Why it matters:** master plan §62 asks for an explicit decision at launch.
**Cost to change later:** low — adding Vercel Analytics or Sentry is an afternoon.
**Recommendation:** confirm "none" at Phase 16.

### `[OPEN-05]` CSV import

**Default in force:** CSV is **export-only** in v1.0; import supports JSON backup, single-deck JSON, and plain-text decklists.
**Why it matters:** master plan §30 lists CSV under "Import: support at least…".
**Cost to change later:** low.
**Recommendation:** Phase 10 adds CSV import only if the text-list parser makes it near-free; otherwise defer.

---

## Superseded / conflicting source statements resolved in Phase 0

For traceability, these master-plan statements are **intentionally not followed**, each by way of an ADR above:

| Source              | Statement                                            | Resolution                                            |
| ------------------- | ---------------------------------------------------- | ----------------------------------------------------- |
| Master plan §42     | "Use Playwright" for E2E                             | Superseded by ADR-012 (TestCafe)                      |
| Master plan §12     | 25-role catalog                                      | Extended to 26 by ADR-014 (Evasion)                   |
| Master plan §28     | `wishlists` + `setMetadata` tables                   | Not created in v1.0 — ADR-017 and `data-model.md` §13 |
| Master plan §14/§34 | Prices illustrated in `€`                            | Default currency is USD — ADR-015                     |
| Phase 07 doc        | `replacementDeckCardId` on the CUT card              | Single one-way link — ADR-018                         |
| Phase 06 doc        | `WarningSeverity` including `'legality'`             | Split into category + severity — ADR-019              |
| Phase 00 doc        | Example commander Iroas / Adeline with Mardu colours | Isshin, Two Heavens as One — ADR-020                  |
