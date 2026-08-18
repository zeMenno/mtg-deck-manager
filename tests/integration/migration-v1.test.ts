import Dexie, { type EntityTable } from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import { uniqueDbName } from "@/tests/helpers/db-test-utils";

/**
 * Proves the v1 → v2 migration stub pattern: empty upgrade runs and data survives.
 * Production still ships schema version 1 only (`lib/db/database.ts`).
 */
class MigratingTestDatabase extends Dexie {
  decks!: EntityTable<{ id: string; name: string }, "id">;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      decks: "id, name",
    });
    this.version(2)
      .stores({
        decks: "id, name, format",
      })
      .upgrade(async (tx) => {
        // Empty data migration stub — indexes only.
        await tx
          .table("decks")
          .toCollection()
          .modify((row) => {
            if (row.format === undefined) {
              row.format = "commander";
            }
          });
      });
  }
}

describe("migration v1 → v2 stub", () => {
  let dbName: string;

  afterEach(async () => {
    if (dbName) {
      await Dexie.delete(dbName);
    }
  });

  it("upgrades with an empty-style upgrade and preserves rows", async () => {
    dbName = uniqueDbName("migration-stub");

    // Open at v1 only first.
    class V1Only extends Dexie {
      decks!: EntityTable<{ id: string; name: string }, "id">;
      constructor() {
        super(dbName);
        this.version(1).stores({ decks: "id, name" });
      }
    }

    const v1 = new V1Only();
    await v1.open();
    await v1.table("decks").add({ id: "d1", name: "Before Upgrade" });
    v1.close();

    const v2 = new MigratingTestDatabase(dbName);
    await v2.open();
    expect(v2.verno).toBe(2);

    const row = await v2.decks.get("d1");
    expect(row?.name).toBe("Before Upgrade");
    expect((row as { format?: string } | undefined)?.format).toBe("commander");
    v2.close();
  });
});
