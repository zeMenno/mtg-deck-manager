/**
 * Import a single deck from JSON, text decklist, or CSV.
 */

import type { DeckBuilderDatabase } from "@/lib/db/database";
import { getDatabase } from "@/lib/db/database";
import {
  CardRepository,
  DeckCardRepository,
  DeckRepository,
} from "@/lib/db/repositories";
import { DeckExportSchema } from "@/lib/import-export/backup-schema";
import { parseDeckCsv } from "@/lib/import-export/csv-deck-parser";
import {
  assertUniqueRemappedIds,
  remapDeckPackage,
} from "@/lib/import-export/id-remap";
import {
  resolveImportCards,
  type ResolveProgress,
} from "@/lib/import-export/resolve-import-cards";
import { parseTextDecklist } from "@/lib/import-export/text-decklist-parser";
import type {
  ImportResult,
  UnresolvedCardRef,
} from "@/lib/import-export/types";
import type { Card } from "@/types/card";
import type { DeckFormat } from "@/types/index";

export type ImportDeckJsonOptions = {
  database?: DeckBuilderDatabase;
  /** Force a display name (e.g. collision rename). */
  nameOverride?: string;
  /** When true, always append " (imported)" on name collision. */
  renameOnCollision?: boolean;
};

async function uniqueDeckName(
  baseName: string,
  database: DeckBuilderDatabase,
  forceSuffix = false,
): Promise<string> {
  const existing = await database.decks.toArray();
  const names = new Set(existing.map((d) => d.name.toLowerCase()));
  let candidate = forceSuffix ? `${baseName} (imported)` : baseName;
  if (!names.has(candidate.toLowerCase())) return candidate;
  candidate = `${baseName} (imported)`;
  if (!names.has(candidate.toLowerCase())) return candidate;
  let n = 2;
  while (names.has(`${baseName} (imported ${n})`.toLowerCase())) {
    n += 1;
  }
  return `${baseName} (imported ${n})`;
}

/**
 * Import a DeckExport JSON package as a new deck (IDs remapped).
 */
export async function importDeckJson(
  raw: unknown,
  options: ImportDeckJsonOptions = {},
): Promise<ImportResult> {
  const database = options.database ?? getDatabase();
  const parsed = DeckExportSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ??
        "This file isn't a valid single-deck export.",
    );
  }

  const pack = parsed.data;
  const name =
    options.nameOverride ??
    (await uniqueDeckName(
      pack.deck.name,
      database,
      options.renameOnCollision === true,
    ));

  const remapped = remapDeckPackage({
    deck: pack.deck as import("@/types/deck").Deck,
    deckCards: pack.deckCards as import("@/types/deck").DeckCard[],
    newName: name,
  });
  assertUniqueRemappedIds(remapped);

  const cardRepo = new CardRepository(database);
  await cardRepo.bulkUpsert(pack.cards as Card[]);

  await database.transaction(
    "rw",
    [database.decks, database.deckCards, database.cards],
    async () => {
      await database.decks.put(remapped.deck);
      if (remapped.deckCards.length) {
        await database.deckCards.bulkPut(remapped.deckCards);
      }
    },
  );

  return {
    added: remapped.deckCards.length,
    updated: 0,
    unresolved: [],
    deckId: remapped.deck.id,
    deckName: remapped.deck.name,
  };
}

export type ImportTextDecklistOptions = {
  database?: DeckBuilderDatabase;
  deckName?: string;
  format?: DeckFormat;
  /** Existing deck id — add cards into it instead of creating. */
  targetDeckId?: string;
  onProgress?: (progress: ResolveProgress) => void;
  lookup?: Parameters<typeof resolveImportCards>[1] extends infer O
    ? O extends { lookup?: infer L }
      ? L
      : never
    : never;
};

/**
 * Import a text decklist into a new or existing deck.
 */
export async function importTextDecklist(
  text: string,
  options: ImportTextDecklistOptions = {},
): Promise<ImportResult> {
  const database = options.database ?? getDatabase();
  const parsed = parseTextDecklist(text);
  if (parsed.lines.length === 0) {
    throw new Error("Decklist is empty — no card lines found.");
  }

  const resolution = await resolveImportCards(
    parsed.lines.map((l) => ({
      name: l.name,
      ...(l.setCode ? { setCode: l.setCode } : {}),
    })),
    {
      database,
      onProgress: options.onProgress,
      ...(options.lookup ? { lookup: options.lookup } : {}),
    },
  );

  const unresolved: UnresolvedCardRef[] = parsed.lines
    .filter((l) => !resolution.byName.has(l.name.toLowerCase()))
    .map((l) => ({
      name: l.name,
      line: l.line,
      zone: l.zone,
      quantity: l.quantity,
      ...(l.setCode ? { setCode: l.setCode } : {}),
    }));

  const decks = new DeckRepository(database);
  const deckCards = new DeckCardRepository(database);

  let deckId = options.targetDeckId;
  let deckName: string | undefined;

  if (!deckId) {
    const name =
      options.deckName?.trim() ||
      parsed.deckName ||
      `Imported deck ${new Date().toISOString().slice(0, 10)}`;
    const unique = await uniqueDeckName(name, database);
    const deck = await decks.create({
      name: unique,
      format: options.format ?? parsed.format ?? "commander",
    });
    deckId = deck.id;
    deckName = deck.name;
  } else {
    const existing = await decks.getById(deckId);
    if (!existing) throw new Error(`Deck not found: ${deckId}`);
    deckName = existing.name;
  }

  let added = 0;
  let commanderId: string | undefined;

  for (const line of parsed.lines) {
    const card = resolution.byName.get(line.name.toLowerCase());
    if (!card) continue;
    await deckCards.add({
      deckId,
      cardId: card.id,
      quantity: line.quantity,
      zone: line.zone,
      status: line.status ?? "current",
      ...(line.foil ? { foil: true } : {}),
    });
    added += 1;
    if (line.zone === "commander" && !commanderId) {
      commanderId = card.id;
    }
  }

  if (commanderId) {
    await decks.update(deckId, { commanderId });
  } else if (parsed.commanderName) {
    const card = resolution.byName.get(parsed.commanderName.toLowerCase());
    if (card) {
      await decks.update(deckId, { commanderId: card.id });
    }
  }

  return {
    added,
    updated: 0,
    unresolved,
    deckId,
    deckName,
  };
}

export type ImportCsvDeckOptions = {
  database?: DeckBuilderDatabase;
  deckName?: string;
  format?: DeckFormat;
  onProgress?: (progress: ResolveProgress) => void;
};

/**
 * Import a CSV deck export as a new deck.
 */
export async function importCsvDeck(
  text: string,
  options: ImportCsvDeckOptions = {},
): Promise<ImportResult> {
  const database = options.database ?? getDatabase();
  const rows = parseDeckCsv(text);
  if (rows.length === 0) {
    throw new Error("CSV deck is empty.");
  }

  const resolution = await resolveImportCards(
    rows.map((r) => ({
      name: r.name,
      ...(r.code ? { setCode: r.code } : {}),
    })),
    {
      database,
      onProgress: options.onProgress,
    },
  );

  const unresolved: UnresolvedCardRef[] = rows
    .filter((r) => !resolution.byName.has(r.name.toLowerCase()))
    .map((r) => ({
      name: r.name,
      line: r.line,
      zone: r.zone,
      quantity: r.quantity,
      ...(r.code ? { setCode: r.code } : {}),
    }));

  const decks = new DeckRepository(database);
  const deckCards = new DeckCardRepository(database);
  const unique = await uniqueDeckName(
    options.deckName?.trim() ||
      `Imported CSV ${new Date().toISOString().slice(0, 10)}`,
    database,
  );
  const deck = await decks.create({
    name: unique,
    format: options.format ?? "commander",
  });

  let added = 0;
  let commanderId: string | undefined;

  for (const row of rows) {
    const card = resolution.byName.get(row.name.toLowerCase());
    if (!card) continue;
    await deckCards.add({
      deckId: deck.id,
      cardId: card.id,
      quantity: row.quantity,
      zone: row.zone,
      status: row.status,
      foil: row.foil,
      owned: row.owned,
      ...(row.notes ? { notes: row.notes } : {}),
      roles: row.roles,
      synergies: row.synergies,
    });
    added += 1;
    if (row.zone === "commander" && !commanderId) {
      commanderId = card.id;
    }
  }

  if (commanderId) {
    await decks.update(deck.id, { commanderId });
  }

  return {
    added,
    updated: 0,
    unresolved,
    deckId: deck.id,
    deckName: deck.name,
  };
}
