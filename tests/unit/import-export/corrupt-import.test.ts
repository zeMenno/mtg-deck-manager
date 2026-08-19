import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  ImportJsonParseError,
  parseJsonText,
} from "@/lib/import-export/read-file";
import { validateBackup } from "@/lib/import-export/validate-backup";

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../fixtures/backups",
);

describe("corrupt import fixtures", () => {
  it("rejects truncated JSON at parse time", () => {
    const raw = readFileSync(join(fixturesDir, "truncated.json"), "utf8");
    expect(() => parseJsonText(raw)).toThrow(ImportJsonParseError);
  });

  it("rejects invalid JSON syntax", () => {
    expect(() => parseJsonText("{ not json")).toThrow(ImportJsonParseError);
  });

  it("rejects wrong field types via validateBackup", () => {
    const result = validateBackup({
      backupVersion: 1,
      appSchemaVersion: 4,
      exportedAt: "2026-01-01T00:00:00.000Z",
      metadata: {
        deckCount: 1,
        cardCount: 0,
        versionCount: 0,
        wishlistItemCount: 0,
      },
      data: {
        // deckId must be string — number should fail schema
        decks: [{ id: 123, name: "Bad", format: "commander" }],
        deckCards: [],
        cards: [],
        tags: [],
        wishlistItems: [],
        deckVersions: [],
        settings: [],
        cardPrices: [],
        appMeta: [],
      },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects missing schema / backupVersion", () => {
    const result = validateBackup({
      exportedAt: "2026-01-01T00:00:00.000Z",
      data: { decks: [] },
    });
    expect(result.ok).toBe(false);
  });
});
