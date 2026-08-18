/**
 * @deprecated Prefer DEFAULT_RECOMMENDATION_CONFIG from `@/types/deck-validation`.
 */

export const DEFAULT_THRESHOLDS = {
  minLands: 33,
  minRamp: 8,
  minDraw: 8,
  minRemoval: 5,
  commanderDeckSize: 100,
} as const;

export type DeckRuleThresholds = typeof DEFAULT_THRESHOLDS;

export const ROLE_IDS = {
  ramp: "role.ramp",
  draw: "role.card-draw",
  removal: "role.removal",
} as const;
