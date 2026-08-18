/**
 * Diff two deck snapshots by cardId:zone (Phase 11).
 *
 * Zone moves (mainboard → sideboard) appear as remove + add.
 * Status-only changes on the same card+zone are reported separately.
 */

import type { DeckCardSnapshot, DeckSnapshot } from "@/types/deck";
import type {
  DiffEntry,
  QuantityChangeEntry,
  StatusChangeEntry,
  VersionDiff,
} from "@/lib/versions/types";

export function deckCardKey(
  row: Pick<DeckCardSnapshot, "cardId" | "zone">,
): string {
  return `${row.cardId}:${row.zone}`;
}

function toDiffEntry(row: DeckCardSnapshot): DiffEntry {
  return {
    cardId: row.cardId,
    zone: row.zone,
    quantity: row.quantity,
    status: row.status,
  };
}

function toMap(cards: DeckCardSnapshot[]): Map<string, DeckCardSnapshot> {
  const map = new Map<string, DeckCardSnapshot>();
  for (const row of cards) {
    map.set(deckCardKey(row), row);
  }
  return map;
}

export function emptyVersionDiff(): VersionDiff {
  return {
    added: [],
    removed: [],
    quantityChanges: [],
    statusChanges: [],
    summary: {
      addedCount: 0,
      removedCount: 0,
      quantityChangeCount: 0,
      statusChangeCount: 0,
    },
  };
}

/**
 * Compare baseline A to target B.
 * - added: in B not A
 * - removed: in A not B
 * - quantityChanges: same card+zone, different qty
 * - statusChanges: same card+zone, different status
 */
export function diffSnapshots(a: DeckSnapshot, b: DeckSnapshot): VersionDiff {
  const mapA = toMap(a.deckCards);
  const mapB = toMap(b.deckCards);

  const added: DiffEntry[] = [];
  const removed: DiffEntry[] = [];
  const quantityChanges: QuantityChangeEntry[] = [];
  const statusChanges: StatusChangeEntry[] = [];

  for (const [key, rowB] of mapB) {
    const rowA = mapA.get(key);
    if (!rowA) {
      added.push(toDiffEntry(rowB));
      continue;
    }

    if (rowA.quantity !== rowB.quantity) {
      quantityChanges.push({
        cardId: rowB.cardId,
        zone: rowB.zone,
        fromQuantity: rowA.quantity,
        toQuantity: rowB.quantity,
        status: rowB.status,
      });
    }

    if (rowA.status !== rowB.status) {
      statusChanges.push({
        cardId: rowB.cardId,
        zone: rowB.zone,
        quantity: rowB.quantity,
        fromStatus: rowA.status,
        toStatus: rowB.status,
      });
    }
  }

  for (const [key, rowA] of mapA) {
    if (!mapB.has(key)) {
      removed.push(toDiffEntry(rowA));
    }
  }

  added.sort((x, y) => x.cardId.localeCompare(y.cardId));
  removed.sort((x, y) => x.cardId.localeCompare(y.cardId));
  quantityChanges.sort((x, y) => x.cardId.localeCompare(y.cardId));
  statusChanges.sort((x, y) => x.cardId.localeCompare(y.cardId));

  return {
    added,
    removed,
    quantityChanges,
    statusChanges,
    summary: {
      addedCount: added.length,
      removedCount: removed.length,
      quantityChangeCount: quantityChanges.length,
      statusChangeCount: statusChanges.length,
    },
  };
}

export function isEmptyDiff(diff: VersionDiff): boolean {
  return (
    diff.summary.addedCount === 0 &&
    diff.summary.removedCount === 0 &&
    diff.summary.quantityChangeCount === 0 &&
    diff.summary.statusChangeCount === 0
  );
}
