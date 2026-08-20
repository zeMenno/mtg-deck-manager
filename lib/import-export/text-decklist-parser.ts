/**
 * Arena / MTGO / Moxfield / Archidekt-dialect text decklist parser.
 */

import type {
  ParsedDecklist,
  ParsedDecklistLine,
} from "@/lib/import-export/types";
import type { DeckCardStatus, DeckCardZone, DeckFormat } from "@/types/index";

const FORMATS: DeckFormat[] = [
  "commander",
  "standard",
  "modern",
  "pioneer",
  "legacy",
  "vintage",
  "pauper",
  "other",
];

const SECTION_HEADERS: Array<{
  pattern: RegExp;
  zone: DeckCardZone;
  status?: DeckCardStatus;
}> = [
  { pattern: /^sideboard\s*:?\s*$/i, zone: "sideboard" },
  { pattern: /^sb\s*:?\s*$/i, zone: "sideboard" },
  { pattern: /^\/\/\s*sideboard\s*$/i, zone: "sideboard" },
  { pattern: /^maybeboard\s*:?\s*$/i, zone: "maybeboard" },
  { pattern: /^maybe\s*:?\s*$/i, zone: "maybeboard" },
  { pattern: /^commander\s*:?\s*$/i, zone: "commander" },
  { pattern: /^\/\/\s*commander\s*$/i, zone: "commander" },
  { pattern: /^\/\/\s*add\s*$/i, zone: "mainboard", status: "add" },
  { pattern: /^\/\/\s*cut\s*$/i, zone: "mainboard", status: "cut" },
  { pattern: /^\/\/\s*consider\s*$/i, zone: "mainboard", status: "consider" },
  { pattern: /^mainboard\s*:?\s*$/i, zone: "mainboard" },
  { pattern: /^deck\s*:?\s*$/i, zone: "mainboard" },
];

/** Normalize smart quotes / odd whitespace in card names. */
export function normalizeCardName(name: string): string {
  return name
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMetaComment(line: string): {
  deckName?: string;
  format?: DeckFormat;
  commanderName?: string;
} | null {
  const trimmed = line
    .replace(/^\/\/\s*/, "")
    .replace(/^#\s*/, "")
    .trim();
  const commanderMatch = trimmed.match(/^commander\s*:\s*(.+)$/i);
  if (commanderMatch) {
    return { commanderName: normalizeCardName(commanderMatch[1]!) };
  }
  const formatMatch = trimmed.match(/^format\s*:\s*(.+)$/i);
  if (formatMatch) {
    const raw = formatMatch[1]!.trim().toLowerCase();
    const format = FORMATS.find((f) => f === raw);
    return format ? { format } : null;
  }
  // Bare title comment at top: "// Soldier Swarm"
  if (
    !trimmed.includes(":") &&
    trimmed.length > 0 &&
    !/^(sideboard|sb|deck|mainboard|add|cut|consider)/i.test(trimmed)
  ) {
    return { deckName: trimmed };
  }
  return null;
}

type QtyParse = {
  quantity: number;
  rest: string;
  foil?: boolean;
  commanderMarker?: boolean;
};

function parseQuantityPrefix(line: string): QtyParse | null {
  let working = line.trim();
  let foil = false;
  let commanderMarker = false;

  // Trailing markers
  if (/\*CMDR\*/i.test(working) || /\bCMDR\b/i.test(working)) {
    commanderMarker = true;
    working = working.replace(/\*CMDR\*/gi, "").replace(/\bCMDR\b/gi, "");
  }
  if (/\*F\*/i.test(working) || /\(foil\)/i.test(working)) {
    foil = true;
    working = working.replace(/\*F\*/gi, "").replace(/\(foil\)/gi, "");
  }
  working = working.trim();

  // "CMDR: Card Name"
  const cmdrPrefix = working.match(/^CMDR\s*:\s*(.+)$/i);
  if (cmdrPrefix) {
    return {
      quantity: 1,
      rest: cmdrPrefix[1]!.trim(),
      commanderMarker: true,
      foil,
    };
  }

  // "[Commander] Card Name"
  const bracketCmdr = working.match(/^\[Commander\]\s*(.+)$/i);
  if (bracketCmdr) {
    return {
      quantity: 1,
      rest: bracketCmdr[1]!.trim(),
      commanderMarker: true,
      foil,
    };
  }

  // "1x Card", "1 x Card", "1 Card"
  const qtyMatch = working.match(/^(\d+)\s*x?\s+(.+)$/i);
  if (qtyMatch) {
    return {
      quantity: Number.parseInt(qtyMatch[1]!, 10),
      rest: qtyMatch[2]!.trim(),
      foil,
      commanderMarker,
    };
  }

  // No quantity — treat as 1 if it looks like a card name
  if (working.length > 0 && !/^\d+$/.test(working)) {
    return { quantity: 1, rest: working, foil, commanderMarker };
  }

  return null;
}

export type NameParts = {
  name: string;
  setCode?: string;
  collectorNumber?: string;
  categories?: string[];
  foil?: boolean;
  warning?: string;
};

const TRAILING_CARET = /\s*\^[^^]*\^\s*$/;
const TRAILING_CATEGORY = /\s*\[([^\]]+)\]\s*$/;
const TRAILING_FINISH = /\s*(?:\*F\*|\*E\*|\(foil\))\s*$/i;
const INLINE_FINISH = /\*F\*|\*E\*|\(foil\)/gi;

function splitCategoryList(raw: string): string[] {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Strip Archidekt-style trailing decorations: foil flags, [categories], ^labels^.
 */
export function stripArchidektDecorations(rest: string): {
  remainder: string;
  categories: string[];
  foil: boolean;
} {
  let working = rest.trim();
  const categories: string[] = [];
  let foil = false;
  let changed = true;

  while (changed && working) {
    changed = false;
    const caret = working.match(TRAILING_CARET);
    if (caret) {
      working = working.slice(0, -caret[0].length).trim();
      changed = true;
      continue;
    }
    const category = working.match(TRAILING_CATEGORY);
    if (category) {
      categories.unshift(...splitCategoryList(category[1] ?? ""));
      working = working.slice(0, -category[0].length).trim();
      changed = true;
      continue;
    }
    const finish = working.match(TRAILING_FINISH);
    if (finish) {
      foil = true;
      working = working.slice(0, -finish[0].length).trim();
      changed = true;
    }
  }

  if (working.match(INLINE_FINISH)) {
    foil = true;
    working = working.replace(INLINE_FINISH, " ").replace(/\s+/g, " ").trim();
  }

  return { remainder: working, categories, foil };
}

/**
 * Parse "Card Name (SET) 123" plus Archidekt decorations after the printing.
 */
export function parseNameWithSet(rest: string): NameParts {
  const decorations = stripArchidektDecorations(normalizeCardName(rest));
  const cleaned = decorations.remainder;
  const withSet = cleaned.match(
    /^(.+?)\s+\(([A-Za-z0-9]+)\)(?:\s+(\S+))?(?:\s+(.*))?$/,
  );

  let name: string;
  let setCode: string | undefined;
  let collectorNumber: string | undefined;
  let leftover: string | undefined;

  if (withSet) {
    name = normalizeCardName(withSet[1]!);
    setCode = withSet[2]!.toLowerCase();
    collectorNumber = withSet[3];
    leftover = withSet[4]?.trim();
  } else {
    name = cleaned;
  }

  const warning = leftover
    ? `Ignored unrecognized tokens after ${name}: ${leftover}`
    : undefined;

  return {
    name,
    ...(setCode ? { setCode } : {}),
    ...(collectorNumber ? { collectorNumber } : {}),
    ...(decorations.categories.length > 0
      ? { categories: decorations.categories }
      : {}),
    ...(decorations.foil ? { foil: true } : {}),
    ...(warning ? { warning } : {}),
  };
}

/**
 * Parse a full text decklist into structured lines.
 */
export function parseTextDecklist(text: string): ParsedDecklist {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const result: ParsedDecklist = { lines: [] };
  let zone: DeckCardZone = "mainboard";
  let status: DeckCardStatus | undefined;
  let sawTitle = false;
  let metaCommentCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? "";
    const trimmed = raw.trim();
    const lineNo = i + 1;

    if (!trimmed) continue;

    // Section headers
    const header = SECTION_HEADERS.find((h) => h.pattern.test(trimmed));
    if (header) {
      zone = header.zone;
      status = header.status;
      continue;
    }

    // Comments
    if (trimmed.startsWith("//") || trimmed.startsWith("#")) {
      // Also treat "// Sideboard" etc — already handled by SECTION_HEADERS
      if (metaCommentCount < 8) {
        const meta = parseMetaComment(trimmed);
        if (meta?.deckName && !result.deckName && !sawTitle) {
          result.deckName = meta.deckName;
          sawTitle = true;
        }
        if (meta?.format && !result.format) result.format = meta.format;
        if (meta?.commanderName && !result.commanderName) {
          result.commanderName = meta.commanderName;
        }
        metaCommentCount += 1;
      }
      continue;
    }

    const qty = parseQuantityPrefix(trimmed);
    if (!qty || qty.quantity < 1) continue;

    const parts = parseNameWithSet(qty.rest);
    if (!parts.name) continue;

    const entryZone: DeckCardZone = qty.commanderMarker ? "commander" : zone;
    if (qty.commanderMarker && !result.commanderName) {
      result.commanderName = parts.name;
    }

    const entry: ParsedDecklistLine = {
      zone: entryZone,
      quantity: qty.quantity,
      name: parts.name,
      line: lineNo,
      raw: trimmed,
      ...(parts.setCode ? { setCode: parts.setCode } : {}),
      ...(parts.collectorNumber
        ? { collectorNumber: parts.collectorNumber }
        : {}),
      ...(parts.categories && parts.categories.length > 0
        ? { categories: parts.categories }
        : {}),
      ...(parts.warning ? { parseWarning: parts.warning } : {}),
      ...(status ? { status } : {}),
      ...(qty.foil || parts.foil ? { foil: true } : {}),
    };
    result.lines.push(entry);
  }

  return result;
}
