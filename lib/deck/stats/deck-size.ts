/**
 * Deck size breakdown.
 *
 * Convention (Commander): total = mainboard + commander = 100 target.
 * Sideboard / maybeboard are reported separately and do not count toward total.
 */

import type { Deck, DeckCard } from "@/types/deck";
import { getActiveDeckCards, sumQuantities } from "@/lib/deck/stats/filters";
import type { DeckCountStats, StatsMode } from "@/lib/deck/stats/types";

const COMMANDER_TARGET = 100;

export function computeDeckSize(
  deck: Deck,
  deckCards: DeckCard[],
  mode: StatsMode = "current",
): DeckCountStats {
  const active = getActiveDeckCards(deckCards, mode);

  const commanderCards = active.filter((c) => c.zone === "commander");
  const mainboardCards = active.filter((c) => c.zone === "mainboard");
  const sideboardCards = active.filter((c) => c.zone === "sideboard");

  // Maybeboard always uses status filter of the mode but keeps maybeboard zone.
  const maybeboardCards = deckCards.filter((c) => {
    if (c.zone !== "maybeboard") return false;
    if (mode === "projected") {
      return c.status === "current" || c.status === "add";
    }
    return c.status === "current";
  });

  const commander = sumQuantities(commanderCards);
  const mainboard = sumQuantities(mainboardCards);
  const sideboard = sumQuantities(sideboardCards);
  const maybeboard = sumQuantities(maybeboardCards);

  // If deck has commanderId but no commander-zone card yet, count 1 when
  // commanderId is set and format is commander (display consistency).
  let commanderCount = commander;
  if (deck.format === "commander" && deck.commanderId && commanderCount === 0) {
    commanderCount = 1;
  }

  const total = mainboard + commanderCount;
  const target = deck.format === "commander" ? COMMANDER_TARGET : total;

  return {
    total,
    commander: commanderCount,
    mainboard,
    sideboard,
    maybeboard,
    target,
  };
}
