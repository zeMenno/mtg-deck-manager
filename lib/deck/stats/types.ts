/**
 * Pure deck statistics types — Phase 6.
 * All values are derived from Deck + DeckCard[] + Card metadata.
 */

import type { DeckCardStatus } from "@/types";
import type { Card, Tag } from "@/types/card";
import type { Deck, DeckCard, DeckCardWithCard } from "@/types/deck";

/** Which card set to aggregate over. */
export type StatsMode = "current" | "projected";

/**
 * Current: status === "current" AND zone !== "maybeboard".
 * Projected: (current OR add), excluding cut; maybeboard excluded.
 * Phase 7 uses projected mode for the upgrade preview.
 */
export type DeckStatsInput = {
  deck: Deck;
  deckCards: DeckCardWithCard[];
  tags?: Tag[];
};

export type DeckCountStats = {
  /** Mainboard + commander quantities (format target denominator). */
  total: number;
  commander: number;
  mainboard: number;
  sideboard: number;
  maybeboard: number;
  /** Commander format target (100 including commander). */
  target: number;
};

export type ManaCurveBucket = {
  /** CMC bucket key; 7 means "7+". */
  cmc: number;
  label: string;
  count: number;
};

export type DistributionItem = {
  id: string;
  label: string;
  count: number;
};

export type ColorDistribution = {
  /** Colored pip presence counts (non-lands): W/U/B/R/G/C. */
  pips: Record<"W" | "U" | "B" | "R" | "G" | "C", number>;
  /** Union of color identity across active cards (+ commander). */
  identity: string[];
};

export type StatusCounts = Record<DeckCardStatus, number>;

export type DeckStats = {
  mode: StatsMode;
  counts: DeckCountStats;
  manaCurve: ManaCurveBucket[];
  typeDistribution: DistributionItem[];
  colorDistribution: ColorDistribution;
  roleDistribution: DistributionItem[];
  synergyDistribution: DistributionItem[];
  statusCounts: StatusCounts;
  /** Cards tagged with Ramp role (quantity-weighted). */
  manaSources: number;
  /** Average mana value of non-land active cards. */
  averageManaValue: number;
  landCount: number;
};

export type { Card, Deck, DeckCard, DeckCardWithCard, Tag };
