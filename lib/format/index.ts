/**
 * Format validation public API — Phase 13.
 */

export type { FormatRules } from "@/lib/format/format-rules";
export {
  getFormatRules,
  FormatRulesFactory,
} from "@/lib/format/format-rules-factory";
export {
  commanderRules,
  getCommanderCurrentWarnings,
  getCommanderProjectedWarnings,
  validateProjectedComposition,
} from "@/lib/format/commander-rules";
export {
  buildProjectedDeck,
  projectedDeckToCards,
} from "@/lib/format/projected-deck-builder";
export {
  getDeckColorIdentity,
  isWithinIdentity,
} from "@/lib/format/validators/color-identity";
export { isBasicLand } from "@/lib/format/validators/helpers";
export { validateDuplicates } from "@/lib/format/validators/duplicate-detection";
export { validateCommanderCount } from "@/lib/format/validators/commander-count";
export { validateDeckSize } from "@/lib/format/validators/deck-size";
export { validateColorIdentity } from "@/lib/format/validators/color-identity";
export { validateCardLegality } from "@/lib/format/validators/card-legality";
export {
  validateLandCount,
  countLandsInDeck,
} from "@/lib/format/validators/land-count";
export { validateRoleCoverage } from "@/lib/format/validators/role-coverage";
export { validateAverageCmc } from "@/lib/format/validators/average-cmc";
export {
  hasLegalityErrors,
  summarizeWarnings,
} from "@/lib/format/warning-utils";
