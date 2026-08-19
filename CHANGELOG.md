# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] — 2026-08-19

### Added

- Card detail **Overview / Legality / Price** tabs with a full Scryfall legality matrix.
- Warn-but-allow confirmation when adding banned / restricted / not-legal cards to a deck format.
- Illegal-format badges on deck card rows.
- Scryfall mana symbology cache (Dexie `symbols`, schema v5) with `ManaCost` / color pip rendering.
- Faceted card search filters (colors, identity, type, rarity, mana value, set, legal-in) for online Scryfall and offline Dexie, with chips + persisted settings.

### Changed

- `Card.legalities` typed as `LegalityFormat` (superset of deck formats).
- Home / search empty states mention filters.

### Notes

- Symbol SVGs are derived data — excluded from JSON backups.
- Inline oracle-text symbol substitution remains out of scope.

## [1.0.0] — 2026-08-19

### Added

- Local-first Commander deck manager PWA (Next.js 15 + Dexie/IndexedDB).
- Deck CRUD with CURRENT / ADD / CUT / CONSIDER card statuses, roles, and synergies.
- Scryfall search, card metadata/images, offline cache, and Scryfall-first pricing with TCGplayer affiliate-style links.
- Changes / upgrade workflow, projected deck, Need to Add pricing, apply changes, and undo snackbars.
- Deck statistics, format validation warnings, versions/compare, wishlist, and JSON backup export/import.
- PWA: manifest, Serwist service worker, install guide, update prompt, offline shell indicator.
- Automated gates: Vitest unit/integration, TestCafe E2E journeys, Knip (blocking), coverage thresholds, GitHub Actions CI.

### Known limitations

- Physical iPhone Home Screen QA / Definition of Done (§70) must be signed off against production before treating the MVP as “daily driver ready.”
- Custom domain is optional; changing the production origin after install creates a **separate** storage bucket.
- Error tracking and analytics are deferred for privacy and simplicity (see `docs/decisions/`).
- Paid/alternate price providers are not wired; Scryfall USD prices only.

### Supported formats

- **Commander** (primary MVP format). Other formats may be stored but are not fully validated.

[1.1.0]: https://github.com/zeMenno/mtg-deck-manager/releases/tag/v1.1.0
[1.0.0]: https://github.com/zeMenno/mtg-deck-manager/releases/tag/v1.0.0
