/**
 * Single-deck export: JSON, human-readable text, CSV.
 */

import type { DeckBuilderDatabase } from "@/lib/db/database";
import { getDatabase } from "@/lib/db/database";
import { nowIso } from "@/lib/db/ids";
import { buildDeckCsv } from "@/lib/import-export/csv-deck-parser";
import { shareOrDownloadFile } from "@/lib/import-export/download-file";
import type { DeckExport, DeckExportFormat } from "@/lib/import-export/types";
import type { Card } from "@/types/card";
import type { Deck, DeckCard } from "@/types/deck";
import type { DeckCardStatus, DeckCardZone } from "@/types/index";

const ZONE_ORDER: DeckCardZone[] = [
  "commander",
  "mainboard",
  "sideboard",
  "maybeboard",
];

const STATUS_COMMENT: Partial<Record<DeckCardStatus, string>> = {
  add: "ADD",
  cut: "CUT",
  consider: "CONSIDER",
};

export type DeckExportBundle = {
  deck: Deck;
  deckCards: DeckCard[];
  cards: Card[];
  cardById: Map<string, Card>;
};

async function loadDeckBundle(
  deckId: string,
  database: DeckBuilderDatabase,
): Promise<DeckExportBundle> {
  const deck = await database.decks.get(deckId);
  if (!deck) {
    throw new Error(`Deck not found: ${deckId}`);
  }
  const deckCards = await database.deckCards
    .where("deckId")
    .equals(deckId)
    .toArray();
  const cardIds = [...new Set(deckCards.map((dc) => dc.cardId))];
  if (deck.commanderId) cardIds.push(deck.commanderId);
  const uniqueIds = [...new Set(cardIds)];
  const cardRows = await database.cards.bulkGet(uniqueIds);
  const cards = cardRows.filter((c): c is Card => c !== undefined);
  const cardById = new Map(cards.map((c) => [c.id, c]));
  return { deck, deckCards, cards, cardById };
}

export async function exportDeckJson(
  deckId: string,
  database: DeckBuilderDatabase = getDatabase(),
): Promise<DeckExport> {
  const { deck, deckCards, cards } = await loadDeckBundle(deckId, database);
  return {
    exportVersion: 1,
    exportedAt: nowIso(),
    deck,
    deckCards,
    cards,
  };
}

function cardName(cardById: Map<string, Card>, cardId: string): string {
  return cardById.get(cardId)?.name ?? cardId;
}

function sortDeckCards(
  deckCards: DeckCard[],
  cardById: Map<string, Card>,
): DeckCard[] {
  return [...deckCards].sort((a, b) => {
    const zi = ZONE_ORDER.indexOf(a.zone) - ZONE_ORDER.indexOf(b.zone);
    if (zi !== 0) return zi;
    const statusOrder = (s: DeckCardStatus) =>
      s === "current" ? 0 : s === "add" ? 1 : s === "consider" ? 2 : 3;
    const si = statusOrder(a.status) - statusOrder(b.status);
    if (si !== 0) return si;
    return cardName(cardById, a.cardId).localeCompare(
      cardName(cardById, b.cardId),
    );
  });
}

/**
 * Human-readable text decklist with commander first and status sections.
 */
export async function exportDeckText(
  deckId: string,
  database: DeckBuilderDatabase = getDatabase(),
): Promise<string> {
  const { deck, deckCards, cardById } = await loadDeckBundle(deckId, database);
  const lines: string[] = [`// ${deck.name}`];

  const commanderCard = deck.commanderId
    ? cardById.get(deck.commanderId)
    : undefined;
  if (commanderCard) {
    lines.push(`// Commander: ${commanderCard.name}`);
  }
  lines.push(
    `// Format: ${deck.format.charAt(0).toUpperCase()}${deck.format.slice(1)}`,
  );
  lines.push("");

  const sorted = sortDeckCards(deckCards, cardById);

  // Commander zone lines
  const commanders = sorted.filter((dc) => dc.zone === "commander");
  for (const dc of commanders) {
    const name = cardName(cardById, dc.cardId);
    lines.push(`${dc.quantity} ${name} *CMDR*`);
  }
  if (commanders.length === 0 && commanderCard) {
    lines.push(`1 ${commanderCard.name} *CMDR*`);
  }

  const byStatusZone = (status: DeckCardStatus, zone: DeckCardZone) =>
    sorted.filter((dc) => dc.status === status && dc.zone === zone);

  // Current mainboard
  for (const dc of byStatusZone("current", "mainboard")) {
    lines.push(`${dc.quantity} ${cardName(cardById, dc.cardId)}`);
  }

  // Sideboard
  const sideboard = sorted.filter((dc) => dc.zone === "sideboard");
  if (sideboard.length > 0) {
    lines.push("");
    lines.push("SIDEBOARD:");
    for (const dc of sideboard) {
      lines.push(`${dc.quantity} ${cardName(cardById, dc.cardId)}`);
    }
  }

  // Maybeboard
  const maybeboard = sorted.filter((dc) => dc.zone === "maybeboard");
  if (maybeboard.length > 0) {
    lines.push("");
    lines.push("MAYBEBOARD:");
    for (const dc of maybeboard) {
      lines.push(`${dc.quantity} ${cardName(cardById, dc.cardId)}`);
    }
  }

  // ADD / CUT / CONSIDER as comment sections
  for (const status of ["add", "cut", "consider"] as const) {
    const section = sorted.filter(
      (dc) => dc.status === status && dc.zone === "mainboard",
    );
    if (section.length === 0) continue;
    lines.push("");
    lines.push(`// ${STATUS_COMMENT[status]}`);
    for (const dc of section) {
      lines.push(`${dc.quantity} ${cardName(cardById, dc.cardId)}`);
    }
  }

  return lines.join("\n") + "\n";
}

export async function exportDeckCsv(
  deckId: string,
  database: DeckBuilderDatabase = getDatabase(),
): Promise<string> {
  const { deckCards, cardById } = await loadDeckBundle(deckId, database);
  const sorted = sortDeckCards(deckCards, cardById);
  return buildDeckCsv(
    sorted.map((deckCard) => ({
      deckCard,
      card: cardById.get(deckCard.cardId),
    })),
  );
}

function slugifyFilename(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "deck"
  );
}

export async function downloadDeckExport(
  deckId: string,
  format: DeckExportFormat,
  database: DeckBuilderDatabase = getDatabase(),
): Promise<"shared" | "downloaded" | "cancelled"> {
  const deck = await database.decks.get(deckId);
  if (!deck) throw new Error(`Deck not found: ${deckId}`);
  const base = slugifyFilename(deck.name);
  const date = new Date().toISOString().slice(0, 10);

  if (format === "json") {
    const data = await exportDeckJson(deckId, database);
    return shareOrDownloadFile(JSON.stringify(data, null, 2), {
      filename: `${base}-${date}.json`,
      mimeType: "application/json",
    });
  }
  if (format === "text") {
    const text = await exportDeckText(deckId, database);
    return shareOrDownloadFile(text, {
      filename: `${base}-${date}.txt`,
      mimeType: "text/plain",
    });
  }
  const csv = await exportDeckCsv(deckId, database);
  return shareOrDownloadFile(csv, {
    filename: `${base}-${date}.csv`,
    mimeType: "text/csv",
  });
}
