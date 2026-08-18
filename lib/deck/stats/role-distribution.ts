/**
 * Role and synergy distribution — counts deck cards × quantity per tag id.
 * A card with 2 roles increments both buckets.
 */

import type { Tag } from "@/types/card";
import type { DeckCardWithCard } from "@/types/deck";
import type { DistributionItem } from "@/lib/deck/stats/types";

const TOP_N = 8;
const OTHER_ID = "__other__";

function buildTagMap(tags: Tag[] | undefined): Map<string, string> {
  const map = new Map<string, string>();
  if (!tags) return map;
  for (const tag of tags) {
    map.set(tag.id, tag.name);
  }
  return map;
}

function countByTagIds(
  cards: DeckCardWithCard[],
  pick: (card: DeckCardWithCard) => string[],
  tagMap: Map<string, string>,
): DistributionItem[] {
  const counts = new Map<string, number>();

  for (const deckCard of cards) {
    const ids = pick(deckCard);
    for (const id of ids) {
      counts.set(id, (counts.get(id) ?? 0) + deckCard.quantity);
    }
  }

  const items: DistributionItem[] = Array.from(counts.entries()).map(
    ([id, count]) => ({
      id,
      label: tagMap.get(id) ?? id,
      count,
    }),
  );

  items.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  if (items.length <= TOP_N) {
    return items;
  }

  const top = items.slice(0, TOP_N);
  const otherCount = items
    .slice(TOP_N)
    .reduce((sum, item) => sum + item.count, 0);
  if (otherCount > 0) {
    top.push({ id: OTHER_ID, label: "Other", count: otherCount });
  }
  return top;
}

export function computeRoleDistribution(
  cards: DeckCardWithCard[],
  tags?: Tag[],
): DistributionItem[] {
  return countByTagIds(cards, (c) => c.roles, buildTagMap(tags));
}

export function computeSynergyDistribution(
  cards: DeckCardWithCard[],
  tags?: Tag[],
): DistributionItem[] {
  return countByTagIds(cards, (c) => c.synergies, buildTagMap(tags));
}

/** Quantity-weighted count of cards that include a given role tag id. */
export function countCardsWithRole(
  cards: DeckCardWithCard[],
  roleId: string,
): number {
  return cards.reduce((sum, c) => {
    if (!c.roles.includes(roleId)) return sum;
    return sum + c.quantity;
  }, 0);
}
