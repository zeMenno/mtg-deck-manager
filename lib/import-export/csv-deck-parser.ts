/**
 * CSV deck export/import helpers.
 */

import type { CsvDeckRow } from "@/lib/import-export/types";
import type { DeckCardStatus, DeckCardZone } from "@/types/index";
import type { DeckCard } from "@/types/deck";
import type { Card } from "@/types/card";

export const CSV_HEADERS = [
  "quantity",
  "name",
  "set",
  "code",
  "status",
  "zone",
  "foil",
  "owned",
  "notes",
  "roles",
  "synergies",
] as const;

const STATUSES = new Set<DeckCardStatus>(["current", "add", "cut", "consider"]);
const ZONES = new Set<DeckCardZone>([
  "commander",
  "mainboard",
  "sideboard",
  "maybeboard",
]);

/** Escape a CSV field (RFC-style quoting). */
export function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function parseBool(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === "") return fallback;
  const v = value.trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(v)) return true;
  if (["false", "0", "no", "n"].includes(v)) return false;
  return fallback;
}

function parseList(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(/[|;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export type DeckCsvExportRow = {
  deckCard: DeckCard;
  card?: Card;
};

/** Build CSV string for a deck's cards. */
export function buildDeckCsv(rows: DeckCsvExportRow[]): string {
  const header = CSV_HEADERS.join(",");
  const body = rows.map(({ deckCard, card }) => {
    const fields = [
      String(deckCard.quantity),
      escapeCsvField(card?.name ?? deckCard.cardId),
      escapeCsvField(card?.setName ?? ""),
      escapeCsvField(card?.setCode ?? ""),
      deckCard.status,
      deckCard.zone,
      String(Boolean(deckCard.foil)),
      String(deckCard.owned ?? false),
      escapeCsvField(deckCard.notes ?? ""),
      escapeCsvField(deckCard.roles.join("|")),
      escapeCsvField(deckCard.synergies.join("|")),
    ];
    return fields.join(",");
  });
  return [header, ...body].join("\n");
}

/**
 * Parse a CSV deck export. Requires the Phase 10 header row.
 */
export function parseDeckCsv(text: string): CsvDeckRow[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length === 0 || !lines[0]?.trim()) {
    throw new Error("CSV file is empty");
  }

  const headerFields = splitCsvLine(lines[0]!).map((h) =>
    h.trim().toLowerCase(),
  );
  const missing = CSV_HEADERS.filter((h) => !headerFields.includes(h));
  // Require at least quantity + name
  if (!headerFields.includes("quantity") || !headerFields.includes("name")) {
    throw new Error(
      `CSV header must include quantity and name columns. Missing: ${missing.join(", ") || "quantity/name"}`,
    );
  }

  const indexOf = (name: string) => headerFields.indexOf(name);

  const rows: CsvDeckRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i]?.trim();
    if (!raw) continue;
    const fields = splitCsvLine(raw);
    const quantity = Number.parseInt(fields[indexOf("quantity")] ?? "1", 10);
    const name = (fields[indexOf("name")] ?? "").trim();
    if (!name || !Number.isFinite(quantity) || quantity < 1) {
      throw new Error(`Invalid CSV row at line ${i + 1}`);
    }

    const statusRaw = (fields[indexOf("status")] ?? "current")
      .trim()
      .toLowerCase() as DeckCardStatus;
    const zoneRaw = (fields[indexOf("zone")] ?? "mainboard")
      .trim()
      .toLowerCase() as DeckCardZone;

    if (!STATUSES.has(statusRaw)) {
      throw new Error(`Invalid status "${statusRaw}" at line ${i + 1}`);
    }
    if (!ZONES.has(zoneRaw)) {
      throw new Error(`Invalid zone "${zoneRaw}" at line ${i + 1}`);
    }

    const setIdx = indexOf("set");
    const codeIdx = indexOf("code");
    const notesIdx = indexOf("notes");
    const rolesIdx = indexOf("roles");
    const synergiesIdx = indexOf("synergies");
    const foilIdx = indexOf("foil");
    const ownedIdx = indexOf("owned");

    rows.push({
      quantity,
      name,
      status: statusRaw,
      zone: zoneRaw,
      foil: foilIdx >= 0 ? parseBool(fields[foilIdx]) : false,
      owned: ownedIdx >= 0 ? parseBool(fields[ownedIdx], false) : false,
      line: i + 1,
      ...(setIdx >= 0 && fields[setIdx] ? { set: fields[setIdx]!.trim() } : {}),
      ...(codeIdx >= 0 && fields[codeIdx]
        ? { code: fields[codeIdx]!.trim() }
        : {}),
      ...(notesIdx >= 0 && fields[notesIdx] ? { notes: fields[notesIdx] } : {}),
      roles: rolesIdx >= 0 ? parseList(fields[rolesIdx]) : [],
      synergies: synergiesIdx >= 0 ? parseList(fields[synergiesIdx]) : [],
    });
  }

  return rows;
}
