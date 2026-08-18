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

| Version | Status  | Notes                                                |
| ------- | ------- | ---------------------------------------------------- |
| 1       | Shipped | Initial MVP schema — see `docs/data-model.md` §13.   |
| 2       | Current | Phase 5: `archived` + `favorite` indexes on `decks`. |

## Adding a migration

```ts
this.version(2)
  .stores({
    // declare changed / new indexes; unchanged tables may be omitted
  })
  .upgrade(async (tx) => {
    // transform existing rows if needed
  });
```

Dexie applies versions in order on open. Keep upgrades idempotent where
practical. Integration coverage lives in `tests/integration/migration-v1.test.ts`.
