/**
 * Public exports for deck versioning (Phase 11).
 */

export {
  MAX_VERSIONS_PER_DECK,
  SNAPSHOT_VERSION,
} from "@/lib/versions/constants";
export {
  deckCardKey,
  diffSnapshots,
  emptyVersionDiff,
  isEmptyDiff,
} from "@/lib/versions/diff";
export {
  applySnapshot,
  captureSnapshot,
  deckCardsMatchSnapshot,
  snapshotRowToDeckCard,
  suggestVersionName,
  toDeckCardSnapshot,
} from "@/lib/versions/snapshot";
export type { ApplySnapshotOptions } from "@/lib/versions/snapshot";
export { VersionService, versionService } from "@/lib/versions/version-service";
export { versionKeys } from "@/lib/versions/version-queries";
export type {
  DiffEntry,
  QuantityChangeEntry,
  SaveVersionInput,
  StatusChangeEntry,
  VersionDiff,
  VersionDiffSummary,
} from "@/lib/versions/types";
export { VersionLimitError } from "@/lib/versions/types";
