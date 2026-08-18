export type {
  ColorDistribution,
  DeckCountStats,
  DeckStats,
  DeckStatsInput,
  DistributionItem,
  ManaCurveBucket,
  StatsMode,
  StatusCounts,
} from "@/lib/deck/stats/types";

export {
  getActiveDeckCards,
  getCurrentDeckCards,
  getProjectedDeckCards,
  sumQuantities,
  withResolvedCards,
} from "@/lib/deck/stats/filters";

export { computeDeckSize } from "@/lib/deck/stats/deck-size";
export {
  computeAverageManaValue,
  computeManaCurve,
  countLands,
} from "@/lib/deck/stats/mana-curve";
export {
  computeTypeDistribution,
  parsePrimaryType,
} from "@/lib/deck/stats/type-distribution";
export {
  buildColorDistribution,
  computeColorDistribution,
  computeColorIdentity,
} from "@/lib/deck/stats/color-distribution";
export {
  computeRoleDistribution,
  computeSynergyDistribution,
  countCardsWithRole,
} from "@/lib/deck/stats/role-distribution";
export { computeStatusCounts } from "@/lib/deck/stats/status-counts";
export { computeDeckStats } from "@/lib/deck/stats/compute-deck-stats";
