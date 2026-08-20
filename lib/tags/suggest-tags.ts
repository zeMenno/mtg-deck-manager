import { kindredTagsFromTypeLine } from "@/lib/tags/kindred-from-type-line";
import { ORACLE_HEURISTICS } from "@/lib/tags/oracle-heuristics";
import type { Card } from "@/types/card";

export type TagSuggestionSource = "type" | "keyword" | "oracle" | "import";

export type TagSuggestionReason = {
  tagId: string;
  source: TagSuggestionSource;
  reason: string;
};

export type TagSuggestions = {
  roles: string[];
  synergies: string[];
  reasons: TagSuggestionReason[];
};

export type SuggestTagsContext = {
  importedRoles?: string[];
  importedSynergies?: string[];
};

const EVASION_KEYWORDS = new Set([
  "flying",
  "trample",
  "menace",
  "shadow",
  "horsemanship",
  "skulk",
]);

function combinedOracleText(card: Card): string {
  return [
    card.oracleText,
    ...(card.faces?.map((face) => face.oracleText) ?? []),
  ]
    .filter((text): text is string => Boolean(text))
    .join("\n");
}

function addReason(
  reasons: TagSuggestionReason[],
  tagId: string,
  source: TagSuggestionSource,
  reason: string,
): void {
  if (reasons.some((item) => item.tagId === tagId)) return;
  reasons.push({ tagId, source, reason });
}

/** Pure, deterministic, network-free role and synergy suggestions. */
export function suggestTags(
  card: Card,
  context: SuggestTagsContext = {},
): TagSuggestions {
  const reasons: TagSuggestionReason[] = [];

  for (const tagId of context.importedRoles ?? []) {
    addReason(reasons, tagId, "import", "Mapped from an imported category");
  }
  for (const tagId of context.importedSynergies ?? []) {
    addReason(reasons, tagId, "import", "Mapped from an imported category");
  }

  for (const tagId of kindredTagsFromTypeLine(card.typeLine)) {
    addReason(
      reasons,
      tagId,
      "type",
      `Creature type appears in “${card.typeLine}”`,
    );
  }

  const isEquipment =
    /\bequipment\b/i.test(card.typeLine) ||
    card.keywords.some((keyword) => keyword.toLowerCase() === "equip");
  if (isEquipment) {
    addReason(
      reasons,
      "synergy.equipment",
      "type",
      "Equipment type or keyword",
    );
  }

  if (
    /\bartifact\b/i.test(card.typeLine) &&
    (!/\bcreature\b/i.test(card.typeLine) || isEquipment)
  ) {
    addReason(reasons, "synergy.artifact", "type", "Artifact card type");
  }
  if (/^enchantment\b/i.test(card.typeLine.trim())) {
    addReason(reasons, "synergy.enchantment", "type", "Enchantment card type");
  }

  const evasion = card.keywords.find((keyword) =>
    EVASION_KEYWORDS.has(keyword.toLowerCase()),
  );
  if (evasion) {
    addReason(
      reasons,
      "role.evasion",
      "keyword",
      `${evasion} helps the creature get through combat`,
    );
  }

  const oracleText = combinedOracleText(card);
  if (
    !/\bland\b/i.test(card.typeLine) &&
    /(?:\{t\}|tap this[^.]*): add \{[wubrgc]\}/i.test(oracleText)
  ) {
    addReason(
      reasons,
      "role.ramp",
      "oracle",
      "A nonland permanent produces mana",
    );
  }
  for (const heuristic of ORACLE_HEURISTICS) {
    if (heuristic.pattern.test(oracleText)) {
      addReason(reasons, heuristic.tagId, "oracle", heuristic.reason);
    }
  }

  return {
    roles: reasons
      .map((reason) => reason.tagId)
      .filter((tagId) => tagId.startsWith("role.")),
    synergies: reasons
      .map((reason) => reason.tagId)
      .filter((tagId) => tagId.startsWith("synergy.")),
    reasons,
  };
}
