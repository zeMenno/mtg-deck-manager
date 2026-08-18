/**
 * DeckWarning summary helpers.
 */

import type {
  DeckValidationSummary,
  DeckWarning,
} from "@/types/deck-validation";

export function hasLegalityErrors(warnings: DeckWarning[]): boolean {
  return warnings.some(
    (w) => w.category === "LEGALITY" && w.severity === "error",
  );
}

export function summarizeWarnings(
  warnings: DeckWarning[],
): DeckValidationSummary {
  let errors = 0;
  let warningCount = 0;
  let recommendations = 0;
  let passed = 0;

  for (const w of warnings) {
    if (w.severity === "success") {
      passed += 1;
      continue;
    }
    if (w.category === "LEGALITY" && w.severity === "error") {
      errors += 1;
    } else if (w.category === "RECOMMENDATION") {
      recommendations += 1;
    } else {
      warningCount += 1;
    }
  }

  return {
    errors,
    warnings: warningCount,
    recommendations,
    passed,
  };
}
