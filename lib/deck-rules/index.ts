/**
 * @deprecated Prefer `@/lib/format` and `@/types/deck-validation`.
 * Compatibility shim for Phase 6 consumers — re-exports Phase 13 API.
 */

export type {
  DeckWarning,
  WarningSeverity,
  WarningCategory,
  RecommendationConfig,
} from "@/types/deck-validation";

export {
  DEFAULT_RECOMMENDATION_CONFIG,
  VALIDATION_ROLE_IDS,
} from "@/types/deck-validation";

export {
  DEFAULT_THRESHOLDS,
  ROLE_IDS,
  type DeckRuleThresholds,
} from "@/lib/deck-rules/thresholds";

export type { FormatRulesInput } from "@/lib/deck-rules/types";
export type { FormatRules } from "@/lib/format/format-rules";

export {
  getDeckColorIdentity as getCommanderColorIdentity,
  isWithinIdentity as isWithinColorIdentity,
} from "@/lib/format/validators/color-identity";
export { findColorIdentityViolations } from "@/lib/deck-rules/color-identity";
export { findDuplicateOracleNames } from "@/lib/deck-rules/duplicate-detection";
export {
  commanderRules,
  getDeckWarnings,
} from "@/lib/deck-rules/commander-rules";
