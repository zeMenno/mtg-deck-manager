/**
 * Capture and apply full deck snapshots (Phase 11).
 */

import type { DeckBuilderDatabase } from "@/lib/db/database";
import { getDatabase } from "@/lib/db/database";
import { createId, nowIso } from "@/lib/db/ids";
import { DeckCardRepository, DeckRepository } from "@/lib/db/repositories";
import { SNAPSHOT_VERSION } from "@/lib/versions/constants";
import type {
  Deck,
  DeckCard,
  DeckCardSnapshot,
  DeckSnapshot,
} from "@/types/deck";

export function toDeckCardSnapshot(row: DeckCard): DeckCardSnapshot {
  const snapshot: DeckCardSnapshot = {
    cardId: row.cardId,
    quantity: row.quantity,
    zone: row.zone,
    status: row.status,
    roles: [...row.roles],
    synergies: [...row.synergies],
  };
  if (row.foil !== undefined) snapshot.foil = row.foil;
  if (row.owned !== undefined) snapshot.owned = row.owned;
  if (row.notes !== undefined) snapshot.notes = row.notes;
  return snapshot;
}

/**
 * Map a snapshot row to a transient DeckCard for read-only UI.
 * IDs are ephemeral (React keys only) — never persisted.
 */
export function snapshotRowToDeckCard(
  row: DeckCardSnapshot,
  deckId: string,
  index = 0,
): DeckCard {
  const timestamp = nowIso();
  const deckCard: DeckCard = {
    id: `snapshot-${deckId}-${index}-${row.cardId}-${row.zone}-${row.status}`,
    deckId,
    cardId: row.cardId,
    quantity: row.quantity,
    zone: row.zone,
    status: row.status,
    roles: [...row.roles],
    synergies: [...row.synergies],
    addedAt: timestamp,
    updatedAt: timestamp,
  };
  if (row.foil !== undefined) deckCard.foil = row.foil;
  if (row.owned !== undefined) deckCard.owned = row.owned;
  if (row.notes !== undefined) deckCard.notes = row.notes;
  return deckCard;
}

export function suggestVersionName(
  versionCount: number,
  at = new Date(),
): string {
  const label = at.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `v${versionCount + 1} — ${label}`;
}

export async function captureSnapshot(
  deckId: string,
  database: DeckBuilderDatabase = getDatabase(),
): Promise<DeckSnapshot> {
  const decks = new DeckRepository(database);
  const deckCards = new DeckCardRepository(database);

  const deck = await decks.getById(deckId);
  if (!deck) {
    throw new Error(`Deck not found: ${deckId}`);
  }

  const rows = await deckCards.listByDeck(deckId);
  const deckPick: DeckSnapshot["deck"] = {
    name: deck.name,
    format: deck.format,
  };
  if (deck.description !== undefined) deckPick.description = deck.description;
  if (deck.commanderId !== undefined) deckPick.commanderId = deck.commanderId;

  return {
    snapshotVersion: SNAPSHOT_VERSION,
    deck: deckPick,
    deckCards: rows.map(toDeckCardSnapshot),
    capturedAt: nowIso(),
  };
}

export type ApplySnapshotOptions = {
  /** When set, updates deck.activeVersionId in the same transaction. */
  activeVersionId?: string | null;
  /** When set, forces deck.updatedAt (e.g. align with version.createdAt). */
  updatedAt?: string;
};

/**
 * Replace live deck metadata + cards with a snapshot (atomic).
 */
export async function applySnapshot(
  deckId: string,
  snapshot: DeckSnapshot,
  database: DeckBuilderDatabase = getDatabase(),
  options: ApplySnapshotOptions = {},
): Promise<void> {
  const decks = new DeckRepository(database);
  const deckCards = new DeckCardRepository(database);

  const existing = await decks.getById(deckId);
  if (!existing) {
    throw new Error(`Deck not found: ${deckId}`);
  }

  await database.transaction(
    "rw",
    database.decks,
    database.deckCards,
    async () => {
      const metaPatch: Partial<Omit<Deck, "id" | "createdAt">> = {
        name: snapshot.deck.name,
        format: snapshot.deck.format,
      };
      if (snapshot.deck.description !== undefined) {
        metaPatch.description = snapshot.deck.description;
      } else {
        metaPatch.description = undefined;
      }
      if (snapshot.deck.commanderId !== undefined) {
        metaPatch.commanderId = snapshot.deck.commanderId;
      } else {
        metaPatch.commanderId = undefined;
      }
      if (options.activeVersionId !== undefined) {
        metaPatch.activeVersionId =
          options.activeVersionId === null
            ? undefined
            : options.activeVersionId;
      }
      if (options.updatedAt !== undefined) {
        metaPatch.updatedAt = options.updatedAt;
      }

      await decks.update(deckId, metaPatch);
      await deckCards.deleteByDeckId(deckId);

      const timestamp = nowIso();
      const inserts: DeckCard[] = snapshot.deckCards.map((row) => {
        const deckCard: DeckCard = {
          id: createId(),
          deckId,
          cardId: row.cardId,
          quantity: row.quantity,
          zone: row.zone,
          status: row.status,
          roles: [...row.roles],
          synergies: [...row.synergies],
          addedAt: timestamp,
          updatedAt: timestamp,
        };
        if (row.foil !== undefined) deckCard.foil = row.foil;
        if (row.owned !== undefined) deckCard.owned = row.owned;
        if (row.notes !== undefined) deckCard.notes = row.notes;
        return deckCard;
      });

      if (inserts.length > 0) {
        await database.deckCards.bulkAdd(inserts);
      }
    },
  );
}

/** Compare snapshot card rows to live deck cards (ignore ephemeral ids/timestamps). */
export function deckCardsMatchSnapshot(
  live: DeckCard[],
  snapshot: DeckSnapshot,
): boolean {
  if (live.length !== snapshot.deckCards.length) return false;

  const serialize = (row: {
    cardId: string;
    quantity: number;
    zone: string;
    status: string;
    foil?: boolean;
    owned?: boolean;
    notes?: string;
    roles: string[];
    synergies: string[];
  }) =>
    JSON.stringify({
      cardId: row.cardId,
      quantity: row.quantity,
      zone: row.zone,
      status: row.status,
      foil: row.foil ?? false,
      owned: row.owned ?? false,
      notes: row.notes ?? "",
      roles: [...row.roles].sort(),
      synergies: [...row.synergies].sort(),
    });

  const a = live.map(serialize).sort();
  const b = snapshot.deckCards.map(serialize).sort();
  return a.every((value, i) => value === b[i]);
}
