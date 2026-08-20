export type OracleHeuristic = {
  tagId: string;
  pattern: RegExp;
  reason: string;
};

/**
 * Conservative, allowlisted oracle-text rules. A missed suggestion is safer
 * than polluting deck statistics with a low-confidence tag.
 */
export const ORACLE_HEURISTICS: readonly OracleHeuristic[] = [
  {
    tagId: "role.ramp",
    pattern:
      /search your library for (?:an? |up to (?:one|two) )?(?:basic )?land card|you may play an additional land/i,
    reason: "Finds lands or grants an extra land play",
  },
  {
    tagId: "role.card-draw",
    pattern: /\bdraw (?:a|one|two|three|x) cards?\b/i,
    reason: "Directly draws cards",
  },
  {
    tagId: "role.counterspell",
    pattern:
      /\bcounter target (?:spell|activated ability|triggered ability)\b/i,
    reason: "Counters a spell or ability",
  },
  {
    tagId: "role.board-wipe",
    pattern:
      /\b(?:destroy|exile) all creatures\b|\ball creatures get -\d+\/-\d+\b|\beach creature\b[^.]*\b(?:destroyed|exiled|gets -)\b/i,
    reason: "Affects all or each creature",
  },
  {
    tagId: "role.removal",
    pattern:
      /\b(?:destroy|exile) target (?:creature|artifact|enchantment|permanent|planeswalker)\b/i,
    reason: "Removes a target permanent",
  },
  {
    tagId: "role.protection",
    pattern:
      /\btarget (?:creature|permanent)[^.]*\bgains? (?:hexproof|indestructible|protection from)\b/i,
    reason: "Grants protection to a target",
  },
  {
    tagId: "role.token-generator",
    pattern: /\bcreate (?:a|an|one|two|three|x|\d+) [^.]* tokens?\b/i,
    reason: "Creates tokens",
  },
  {
    tagId: "synergy.token",
    pattern: /\bcreate (?:a|an|one|two|three|x|\d+) [^.]* tokens?\b/i,
    reason: "Creates tokens",
  },
  {
    tagId: "synergy.plus-one-counter",
    pattern: /\+1\/\+1 counters?/i,
    reason: "Uses +1/+1 counters",
  },
  {
    tagId: "role.sacrifice-outlet",
    pattern: /\bsacrifice (?:a|another) creature\s*:/i,
    reason: "Has an activated creature-sacrifice cost",
  },
  {
    tagId: "synergy.sacrifice",
    pattern: /\bsacrifice (?:a|another) creature\s*:/i,
    reason: "Has an activated creature-sacrifice cost",
  },
  {
    tagId: "role.recursion",
    pattern:
      /\breturn target [^.]* card from your graveyard to (?:your hand|the battlefield)\b/i,
    reason: "Returns a card from your graveyard",
  },
  {
    tagId: "synergy.graveyard",
    pattern:
      /\breturn target [^.]* card from your graveyard to (?:your hand|the battlefield)\b/i,
    reason: "Uses cards in your graveyard",
  },
  {
    tagId: "synergy.reanimation",
    pattern:
      /\breturn target creature card from your graveyard to the battlefield\b/i,
    reason: "Returns a creature from your graveyard to the battlefield",
  },
];
