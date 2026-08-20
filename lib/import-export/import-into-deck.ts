/**
 * Preview and apply a text decklist into an existing deck (ADR-025).
 */

import type { DeckBuilderDatabase } from "@/lib/db/database";
import { getDatabase } from "@/lib/db/database";
import {
  CardRepository,
  DeckRepository,
  SettingsRepository,
} from "@/lib/db/repositories";
import { DeckCardService, DeckService } from "@/lib/deck/deck-service";
import { mapArchidektCategories } from "@/lib/import-export/archidekt-categories";
import {
  importCardKey,
  resolveImportCards,
  type ResolveImportCardsOptions,
  type ResolveProgress,
} from "@/lib/import-export/resolve-import-cards";
import { parseTextDecklist } from "@/lib/import-export/text-decklist-parser";
import { suggestTags } from "@/lib/tags/suggest-tags";
import type {
  ImportResult,
  ParsedDecklistLine,
  UnresolvedCardRef,
} from "@/lib/import-export/types";
import type { DeckCardStatus, DeckCardZone } from "@/types";
import type { Card } from "@/types/card";
import type { Deck, DeckCard } from "@/types/deck";

export type ExistingDeckConflictPolicy =
  "skip-existing" | "add-even-if-present" | "replace-printing";

export type ImportIntoDeckNewStatus = Extract<
  DeckCardStatus,
  "consider" | "current" | "add"
>;

export type ImportIntoDeckPreviewRow = {
  line: number;
  name: string;
  quantity: number;
  zone: DeckCardZone;
  cardId?: string;
  oracleId?: string;
  existingDeckCardId?: string;
  roles: string[];
  synergies: string[];
  ignoredCategories: string[];
  foil?: boolean;
  setCode?: string;
  collectorNumber?: string;
  parseWarning?: string;
  reason?: string;
};

export type ImportIntoDeckPreview = {
  deckId: string;
  deckName: string;
  newRows: ImportIntoDeckPreviewRow[];
  skipped: ImportIntoDeckPreviewRow[];
  replaceRows: ImportIntoDeckPreviewRow[];
  unresolved: UnresolvedCardRef[];
  ignoredCategories: string[];
  maybeboardCount: number;
  parseWarnings: string[];
};

export type PreviewImportIntoDeckOptions = ResolveImportCardsOptions & {
  database?: DeckBuilderDatabase;
  onProgress?: (progress: ResolveProgress) => void;
  policy?: ExistingDeckConflictPolicy;
  newStatus?: ImportIntoDeckNewStatus;
  applyCategoriesOnReplace?: boolean;
};

export type ApplyImportIntoDeckOptions = PreviewImportIntoDeckOptions;

function unionUnique(
  existing: string[] | undefined,
  extra: string[],
): string[] {
  const seen = new Set(existing ?? []);
  for (const id of extra) seen.add(id);
  return [...seen];
}

function unresolvedFromLine(line: ParsedDecklistLine): UnresolvedCardRef {
  return {
    name: line.name,
    line: line.line,
    zone: line.zone,
    quantity: line.quantity,
    ...(line.setCode ? { setCode: line.setCode } : {}),
    ...(line.collectorNumber ? { collectorNumber: line.collectorNumber } : {}),
  };
}

function findExistingOracleInZone(
  rows: DeckCard[],
  cardsById: Map<string, Card>,
  oracleId: string,
  zone: DeckCardZone,
): DeckCard | undefined {
  return rows.find((row) => {
    if (row.zone !== zone) return false;
    if (row.status === "cut") return false;
    return cardsById.get(row.cardId)?.oracleId === oracleId;
  });
}

async function loadCardsById(
  database: DeckBuilderDatabase,
  rows: DeckCard[],
): Promise<Map<string, Card>> {
  const repo = new CardRepository(database);
  const ids = [...new Set(rows.map((row) => row.cardId))];
  const cards = await repo.getByIds(ids);
  return new Map(cards.map((card) => [card.id, card]));
}

function toPreviewRow(
  line: ParsedDecklistLine,
  extras: Partial<ImportIntoDeckPreviewRow> & { card?: Card },
  suggestOnAdd: boolean,
): ImportIntoDeckPreviewRow {
  const { card, ...rest } = extras;
  const mapped = mapArchidektCategories(line.categories);
  const heuristic =
    suggestOnAdd && card
      ? suggestTags(card, {
          importedRoles: mapped.roleIds,
          importedSynergies: mapped.synergyIds,
        })
      : null;
  const roles =
    mapped.roleIds.length > 0 ? mapped.roleIds : (heuristic?.roles ?? []);
  const synergies = [
    ...new Set([...mapped.synergyIds, ...(heuristic?.synergies ?? [])]),
  ];
  return {
    line: line.line,
    name: line.name,
    quantity: line.quantity,
    zone: line.zone,
    roles,
    synergies,
    ignoredCategories: mapped.ignored,
    ...(line.foil ? { foil: true } : {}),
    ...(line.setCode ? { setCode: line.setCode } : {}),
    ...(line.collectorNumber ? { collectorNumber: line.collectorNumber } : {}),
    ...(line.parseWarning ? { parseWarning: line.parseWarning } : {}),
    ...(card ? { cardId: card.id, oracleId: card.oracleId } : {}),
    ...rest,
  };
}

export async function previewImportIntoDeck(
  text: string,
  deckId: string,
  options: PreviewImportIntoDeckOptions = {},
): Promise<ImportIntoDeckPreview> {
  const database = options.database ?? getDatabase();
  const parsed = parseTextDecklist(text);
  if (parsed.lines.length === 0) {
    throw new Error("Decklist is empty — no card lines found.");
  }

  const decks = new DeckRepository(database);
  const deck = await decks.getById(deckId);
  if (!deck) throw new Error(`Deck not found: ${deckId}`);

  const resolution = await resolveImportCards(
    parsed.lines.map((line) => ({
      name: line.name,
      ...(line.setCode ? { setCode: line.setCode } : {}),
      ...(line.collectorNumber
        ? { collectorNumber: line.collectorNumber }
        : {}),
    })),
    {
      database,
      onProgress: options.onProgress,
      ...(options.lookup ? { lookup: options.lookup } : {}),
    },
  );

  const deckCards = new DeckCardService(database);
  const existingRows = await deckCards.listByDeck(deckId);
  const cardsById = await loadCardsById(database, existingRows);
  for (const card of resolution.byKey.values()) {
    cardsById.set(card.id, card);
  }

  const policy = options.policy ?? "skip-existing";
  const suggestOnAdd = await new SettingsRepository(database).get(
    "tags.suggestOnAdd",
  );
  const newRows: ImportIntoDeckPreviewRow[] = [];
  const skipped: ImportIntoDeckPreviewRow[] = [];
  const replaceRows: ImportIntoDeckPreviewRow[] = [];
  const unresolved: UnresolvedCardRef[] = [];
  const ignored = new Set<string>();
  const parseWarnings: string[] = [];

  for (const line of parsed.lines) {
    if (line.parseWarning) parseWarnings.push(line.parseWarning);
    const mapped = mapArchidektCategories(line.categories);
    for (const name of mapped.ignored) ignored.add(name);

    const card = resolution.byKey.get(importCardKey(line));
    if (!card) {
      unresolved.push(unresolvedFromLine(line));
      continue;
    }

    if (line.zone === "commander" && deck.commanderId) {
      skipped.push(
        toPreviewRow(
          line,
          {
            card,
            reason: "Commander already set",
          },
          suggestOnAdd,
        ),
      );
      continue;
    }

    const existing = findExistingOracleInZone(
      existingRows,
      cardsById,
      card.oracleId,
      line.zone,
    );

    if (!existing) {
      newRows.push(toPreviewRow(line, { card }, suggestOnAdd));
      continue;
    }

    if (
      policy === "replace-printing" &&
      line.setCode &&
      line.collectorNumber &&
      existing.cardId !== card.id
    ) {
      replaceRows.push(
        toPreviewRow(
          line,
          {
            card,
            existingDeckCardId: existing.id,
            reason: "Replace printing",
          },
          suggestOnAdd,
        ),
      );
      continue;
    }

    if (policy === "add-even-if-present") {
      newRows.push(
        toPreviewRow(
          line,
          {
            card,
            existingDeckCardId: existing.id,
            reason: "Already in deck — will add as consider",
          },
          suggestOnAdd,
        ),
      );
      continue;
    }

    skipped.push(
      toPreviewRow(
        line,
        {
          card,
          existingDeckCardId: existing.id,
          reason: "Already in deck",
        },
        suggestOnAdd,
      ),
    );
  }

  return {
    deckId: deck.id,
    deckName: deck.name,
    newRows,
    skipped,
    replaceRows,
    unresolved,
    ignoredCategories: [...ignored],
    maybeboardCount: parsed.lines.filter((l) => l.zone === "maybeboard").length,
    parseWarnings,
  };
}

export async function applyImportIntoDeck(
  text: string,
  deckId: string,
  options: ApplyImportIntoDeckOptions = {},
): Promise<ImportResult> {
  const database = options.database ?? getDatabase();
  const preview = await previewImportIntoDeck(text, deckId, options);
  const newStatus = options.newStatus ?? "consider";
  const policy = options.policy ?? "skip-existing";
  const applyCategoriesOnReplace = options.applyCategoriesOnReplace === true;

  const deckService = new DeckService(database);
  const deckCards = new DeckCardService(database);
  const decks = new DeckRepository(database);
  let deck: Deck | undefined = await decks.getById(deckId);
  if (!deck) throw new Error(`Deck not found: ${deckId}`);

  let added = 0;
  let updated = 0;

  for (const row of preview.newRows) {
    if (!row.cardId) continue;
    const status: DeckCardStatus =
      row.zone === "commander"
        ? "current"
        : policy === "add-even-if-present" && row.existingDeckCardId
          ? "consider"
          : newStatus;

    const result = await deckCards.addCardToDeck({
      deckId,
      cardId: row.cardId,
      quantity: row.quantity,
      zone: row.zone,
      status,
      foil: row.foil,
      roles: row.roles,
      synergies: row.synergies,
    });
    added += result.merged ? 0 : 1;
    updated += result.merged ? 1 : 0;

    if (row.zone === "commander" && !deck.commanderId) {
      deck = await deckService.setCommander(deckId, result.deckCard.cardId);
    }
  }

  for (const row of preview.replaceRows) {
    if (!row.cardId || !row.existingDeckCardId) continue;
    const switched = await deckCards.switchPrinting({
      deckCardId: row.existingDeckCardId,
      newCardId: row.cardId,
    });
    updated += 1;
    if (applyCategoriesOnReplace) {
      const nextRoles = unionUnique(switched.deckCard.roles, row.roles);
      const nextSynergies = unionUnique(
        switched.deckCard.synergies,
        row.synergies,
      );
      await deckCards.updateDeckCard(switched.deckCard.id, {
        roles: nextRoles,
        synergies: nextSynergies,
      });
    }
  }

  return {
    added,
    updated,
    unresolved: preview.unresolved,
    deckId,
    deckName: preview.deckName,
  };
}
