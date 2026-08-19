# Dexie Schema Migrations

## Policy

1. **Never edit version 1 (or any shipped version) in place.** Once a schema
   version has shipped to users, its `.stores({…})` definition is immutable.
2. **All changes go through a new version.** Add
   `this.version(n).stores({…}).upgrade(tx => {…})` for data transforms.
3. **Document every version** in this file before merging.
4. **Backup format** (`AppBackup.appSchemaVersion`) records the Dexie version at
   export time so import can decide whether a migration is needed (Phase 10).

## Version history

| Version | Status  | Notes                                                                      |
| ------- | ------- | -------------------------------------------------------------------------- |
| 1       | Shipped | Initial MVP schema — see `docs/data-model.md` §13.                         |
| 2       | Shipped | Phase 5: `archived` + `favorite` indexes on `decks`.                       |
| 3       | Shipped | Phase 7: `replacesDeckCardId` index on `deckCards`.                        |
| 4       | Shipped | Phase 12: richer `wishlistItems` indexes.                                  |
| 5       | Current | Phase 17: `symbols` symbology cache (`symbol, updatedAt`). Not in backups. |

## Adding a migration

```ts
this.version(n)
  .stores({
    // declare changed / new indexes; unchanged tables may be omitted
  })
  .upgrade(async (tx) => {
    // transform existing rows if needed
  });
```

Dexie applies versions in order on open. Keep upgrades idempotent where
practical. Integration coverage: `tests/integration/db-migrations.test.ts`.
