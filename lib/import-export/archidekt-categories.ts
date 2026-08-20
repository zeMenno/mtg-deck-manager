/**
 * Map Archidekt `[category]` display names onto seeded role/synergy tag ids.
 * Unmapped strings and type buckets are ignored (ADR-025).
 */

import { buildDefaultTags } from "@/lib/db/seed/default-tags";

const TYPE_BUCKETS = new Set(
  [
    "land",
    "lands",
    "creature",
    "creatures",
    "instant",
    "instants",
    "sorcery",
    "sorceries",
    "enchantment",
    "enchantments",
    "artifact",
    "artifacts",
    "planeswalker",
    "planeswalkers",
    "battle",
    "battles",
    "maybeboard",
    "maybe",
    "commander",
    "commanders",
    "sideboard",
  ].map((name) => name.toLowerCase()),
);

/** Extra aliases that are not exact seeded names. */
const ALIASES: Record<string, string> = {
  draw: "role.card-draw",
  "card draw": "role.card-draw",
  wrath: "role.board-wipe",
  "board wipe": "role.board-wipe",
  tokens: "synergy.token",
  token: "synergy.token",
  "+1/+1 counters": "synergy.plus-one-counter",
  "+1/+1 counter": "synergy.plus-one-counter",
  counters: "synergy.plus-one-counter",
};

function catalogMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const tag of buildDefaultTags()) {
    map.set(tag.name.trim().toLowerCase(), tag.id);
  }
  for (const [alias, id] of Object.entries(ALIASES)) {
    if (!map.has(alias)) map.set(alias, id);
  }
  return map;
}

const NAME_TO_TAG_ID = catalogMap();

export type MappedArchidektCategories = {
  roleIds: string[];
  synergyIds: string[];
  ignored: string[];
};

export function isArchidektTypeBucket(name: string): boolean {
  return TYPE_BUCKETS.has(name.trim().toLowerCase());
}

export function mapArchidektCategory(name: string): string | undefined {
  const key = name.trim().toLowerCase();
  if (!key || TYPE_BUCKETS.has(key)) return undefined;
  return NAME_TO_TAG_ID.get(key);
}

export function mapArchidektCategories(
  names: string[] | undefined,
): MappedArchidektCategories {
  const roleIds: string[] = [];
  const synergyIds: string[] = [];
  const ignored: string[] = [];
  const seenIds = new Set<string>();
  const seenIgnored = new Set<string>();

  for (const raw of names ?? []) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const id = mapArchidektCategory(trimmed);
    if (!id) {
      const key = trimmed.toLowerCase();
      if (!seenIgnored.has(key)) {
        seenIgnored.add(key);
        ignored.push(trimmed);
      }
      continue;
    }
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    if (id.startsWith("synergy.")) synergyIds.push(id);
    else roleIds.push(id);
  }

  return { roleIds, synergyIds, ignored };
}
