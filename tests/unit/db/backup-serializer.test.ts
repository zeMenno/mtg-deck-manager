import { describe, expect, it } from "vitest";

import { createId } from "@/lib/db/ids";
import { exportFullBackup } from "@/lib/import-export/export-full-backup";
import { isAppBackupShape } from "@/lib/import-export/validate-backup";
import { buildDefaultTags } from "@/lib/db/seed/default-tags";
import {
  closeAndDelete,
  resetDatabase,
  seedDeck,
} from "@/tests/helpers/db-test-utils";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("createId", () => {
  it("returns a UUID string", () => {
    expect(createId()).toMatch(UUID_RE);
  });
});

describe("buildDefaultTags", () => {
  it("seeds 26 roles and 23 synergies", () => {
    const tags = buildDefaultTags();
    expect(tags.filter((t) => t.category === "role")).toHaveLength(26);
    expect(tags.filter((t) => t.category === "synergy")).toHaveLength(23);
    expect(tags.every((t) => t.seeded === true)).toBe(true);
  });
});

describe("backup serializer JSON shape", () => {
  it("exports a valid AppBackup document", async () => {
    const database = await resetDatabase();
    await seedDeck(database);

    const backup = await exportFullBackup(database, {
      appVersion: "0.1.0",
      userAgent: "vitest",
    });

    expect(isAppBackupShape(backup)).toBe(true);
    expect(backup.backupVersion).toBe(1);
    expect(backup.appSchemaVersion).toBe(4);
    expect(backup.exportedFrom.appVersion).toBe("0.1.0");
    expect(backup.metadata.deckCount).toBe(1);
    expect(backup.metadata.cardCount).toBe(1);
    expect(backup.metadata.versionCount).toBe(0);
    expect(backup.metadata.wishlistItemCount).toBe(0);
    expect(Array.isArray(backup.data.decks)).toBe(true);
    expect(Array.isArray(backup.data.deckCards)).toBe(true);
    expect(Array.isArray(backup.data.appMeta)).toBe(true);
    expect(Array.isArray(backup.data.tags)).toBe(true);
    expect(backup.data.tags.length).toBe(49);

    await closeAndDelete(database);
  });
});
