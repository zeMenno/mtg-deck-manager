/**
 * FormatRules factory — selects rules by deck.format.
 */

import { commanderRules } from "@/lib/format/commander-rules";
import type { FormatRules } from "@/lib/format/format-rules";
import { warning } from "@/lib/format/validators/helpers";
import type { DeckFormat } from "@/types/index";
import type { DeckWarning } from "@/types/deck-validation";

function stubWarnings(format: DeckFormat): DeckWarning[] {
  return [
    warning({
      id: "format-stub",
      code: "FORMAT_UNSUPPORTED",
      category: "WARNING",
      severity: "info",
      message: `Format validation for ${format} is not available`,
      details: "Only Commander validation is implemented in MVP.",
    }),
  ];
}

const stubRules = (format: DeckFormat): FormatRules => ({
  format,
  getDeckWarnings() {
    return stubWarnings(format);
  },
  getProjectedWarnings() {
    return stubWarnings(format);
  },
});

export function getFormatRules(format: DeckFormat): FormatRules {
  if (format === "commander") {
    return commanderRules;
  }
  return stubRules(format);
}

export const FormatRulesFactory = {
  get: getFormatRules,
};
