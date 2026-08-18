export type {
  ApplyChangesResult,
  ApplyValidation,
  ApplyValidationIssue,
  DeckChangeSummary,
  OnApplyComplete,
  ProjectedDeckViewModel,
  ProjectedRowKind,
  ReplacementPair,
} from "@/lib/deck/changes/types";

export {
  canApply,
  computeChangeSummary,
} from "@/lib/deck/changes/change-summary";

export {
  annotateProjectedKind,
  buildProjectedDeckList,
  computeProjectedCounts,
  getProjectedDeckCards,
  sumProjectedQuantity,
} from "@/lib/deck/changes/projected-deck";

export {
  getReplacementForAdd,
  getReplacementForCut,
  linkReplacement,
  ReplacementLinkError,
  ReplacementLinkService,
  replacementLinkService,
  unlinkReplacement,
} from "@/lib/deck/changes/replacement-links";

export {
  demoteAddToConsider,
  dismissConsider,
  markCurrentAsCut,
  promoteConsiderToAdd,
  PromoteDemoteService,
  promoteDemoteService,
  revertCutToCurrent,
} from "@/lib/deck/changes/promote-demote";

export {
  applyChanges,
  ApplyChangesService,
  applyChangesService,
  validateBeforeApply,
} from "@/lib/deck/changes/apply-changes";
