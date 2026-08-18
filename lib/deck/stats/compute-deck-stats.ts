/**
 * Master deck stats orchestrator — pure, no DB access.
 */

import { buildColorDistribution } from "@/lib/deck/stats/color-distribution";
import { computeDeckSize } from "@/lib/deck/stats/deck-size";
import { getActiveDeckCards } from "@/lib/deck/stats/filters";
import {
  computeAverageManaValue,
  computeManaCurve,
  countLands,
} from "@/lib/deck/stats/mana-curve";
import {
  computeRoleDistribution,
  computeSynergyDistribution,
  countCardsWithRole,
} from "@/lib/deck/stats/role-distribution";
import { computeStatusCounts } from "@/lib/deck/stats/status-counts";
import { computeTypeDistribution } from "@/lib/deck/stats/type-distribution";
import type {
  DeckStats,
  DeckStatsInput,
  StatsMode,
} from "@/lib/deck/stats/types";

const RAMP_ROLE_ID = "role.ramp";

export function computeDeckStats(
  input: DeckStatsInput,
  mode: StatsMode = "current",
): DeckStats {
  const { deck, deckCards, tags } = input;
  const active = getActiveDeckCards(deckCards, mode);

  const commanderCard =
    active.find((c) => c.zone === "commander")?.card ??
    (deck.commanderId
      ? deckCards.find((c) => c.cardId === deck.commanderId)?.card
      : undefined);

  return {
    mode,
    counts: computeDeckSize(deck, deckCards, mode),
    manaCurve: computeManaCurve(active),
    typeDistribution: computeTypeDistribution(active),
    colorDistribution: buildColorDistribution(deck, active, commanderCard),
    roleDistribution: computeRoleDistribution(active, tags),
    synergyDistribution: computeSynergyDistribution(active, tags),
    statusCounts: computeStatusCounts(deckCards),
    manaSources: countCardsWithRole(active, RAMP_ROLE_ID),
    averageManaValue: computeAverageManaValue(active),
    landCount: countLands(active),
  };
}
