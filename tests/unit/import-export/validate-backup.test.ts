import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { validateBackup } from "@/lib/import-export/validate-backup";

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../fixtures/backups",
);

function loadJson(name: string): unknown {
  return JSON.parse(readFileSync(join(fixturesDir, name), "utf8"));
}

describe("validateBackup", () => {
  it("accepts a valid v1 backup fixture", () => {
    const result = validateBackup(loadJson("valid-v1.json"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.backup.metadata.deckCount).toBe(1);
      expect(result.backup.data.appMeta).toEqual([]);
    }
  });

  it("rejects missing decks array", () => {
    const result = validateBackup(loadJson("missing-decks.json"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some(
          (e) => /decks/i.test(e.path) || /decks/i.test(e.message),
        ),
      ).toBe(true);
    }
  });

  it("rejects future backupVersion", () => {
    const result = validateBackup(loadJson("wrong-schema.json"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.message).toMatch(/newer app version/i);
    }
  });

  it("rejects orphan deckCards", () => {
    const valid = loadJson("valid-v1.json") as {
      data: { decks: unknown[]; deckCards: Array<{ deckId: string }> };
    };
    valid.data.deckCards[0]!.deckId = "missing-deck-id";
    const result = validateBackup(valid);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.message).toMatch(/missing deck/i);
    }
  });

  it("warns when card row is missing but does not hard-fail", () => {
    const valid = loadJson("valid-v1.json") as {
      data: { cards: unknown[] };
    };
    valid.data.cards = [];
    const result = validateBackup(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.warnings.some((w) => /card/i.test(w.message))).toBe(true);
    }
  });

  it("rejects binary image payloads", () => {
    const valid = loadJson("valid-v1.json") as {
      data: { cards: Array<Record<string, unknown>> };
    };
    valid.data.cards[0]!.imageNormal =
      "data:image/png;base64," + "A".repeat(300);
    const result = validateBackup(valid);
    expect(result.ok).toBe(false);
  });
});
