/**
 * Default role (26) and synergy (23) tags — locked in `docs/product-spec.md` §5.
 * Tag ids are stable slugs (not UUIDs) so backups reconnect after re-seed.
 */

import type { Tag } from "@/types/card";

type SeedEntry = { id: string; name: string };

const ROLE_ENTRIES: SeedEntry[] = [
  { id: "role.ramp", name: "Ramp" },
  { id: "role.card-draw", name: "Card Draw" },
  { id: "role.card-selection", name: "Card Selection" },
  { id: "role.removal", name: "Removal" },
  { id: "role.board-wipe", name: "Board Wipe" },
  { id: "role.protection", name: "Protection" },
  { id: "role.interaction", name: "Interaction" },
  { id: "role.counterspell", name: "Counterspell" },
  { id: "role.anthem", name: "Anthem" },
  { id: "role.token-generator", name: "Token Generator" },
  { id: "role.token-payoff", name: "Token Payoff" },
  { id: "role.recursion", name: "Recursion" },
  { id: "role.tutor", name: "Tutor" },
  { id: "role.cost-reduction", name: "Cost Reduction" },
  { id: "role.mana-fixing", name: "Mana Fixing" },
  { id: "role.sacrifice-outlet", name: "Sacrifice Outlet" },
  { id: "role.graveyard-hate", name: "Graveyard Hate" },
  { id: "role.pillowfort", name: "Pillowfort" },
  { id: "role.life-gain", name: "Life Gain" },
  { id: "role.voltron", name: "Voltron" },
  { id: "role.win-condition", name: "Win Condition" },
  { id: "role.finisher", name: "Finisher" },
  { id: "role.utility", name: "Utility" },
  { id: "role.combo-piece", name: "Combo Piece" },
  { id: "role.evasion", name: "Evasion" },
  { id: "role.other", name: "Other" },
];

const SYNERGY_ENTRIES: SeedEntry[] = [
  { id: "synergy.soldier", name: "Soldier" },
  { id: "synergy.human", name: "Human" },
  { id: "synergy.warrior", name: "Warrior" },
  { id: "synergy.knight", name: "Knight" },
  { id: "synergy.token", name: "Token" },
  { id: "synergy.go-wide", name: "Go-Wide" },
  { id: "synergy.plus-one-counter", name: "+1/+1 Counter" },
  { id: "synergy.equipment", name: "Equipment" },
  { id: "synergy.artifact", name: "Artifact" },
  { id: "synergy.enchantment", name: "Enchantment" },
  { id: "synergy.etb", name: "ETB" },
  { id: "synergy.death-trigger", name: "Death Trigger" },
  { id: "synergy.sacrifice", name: "Sacrifice" },
  { id: "synergy.graveyard", name: "Graveyard" },
  { id: "synergy.combat", name: "Combat" },
  { id: "synergy.aggro", name: "Aggro" },
  { id: "synergy.control", name: "Control" },
  { id: "synergy.midrange", name: "Midrange" },
  { id: "synergy.tribal", name: "Tribal" },
  { id: "synergy.protection", name: "Protection" },
  { id: "synergy.blink", name: "Blink" },
  { id: "synergy.reanimation", name: "Reanimation" },
  { id: "synergy.spells-matter", name: "Spells Matter" },
];

/** Current seed catalog version — bump when seeded lists change. */
export const TAGS_SEED_VERSION = 1;

export function buildDefaultTags(): Tag[] {
  const roles: Tag[] = ROLE_ENTRIES.map((entry, index) => ({
    id: entry.id,
    name: entry.name,
    category: "role",
    seeded: true,
    sortOrder: index + 1,
  }));

  const synergies: Tag[] = SYNERGY_ENTRIES.map((entry, index) => ({
    id: entry.id,
    name: entry.name,
    category: "synergy",
    seeded: true,
    sortOrder: index + 1,
  }));

  return [...roles, ...synergies];
}
