const KINDRED_TAGS: ReadonlyArray<readonly [string, string]> = [
  ["soldier", "synergy.soldier"],
  ["human", "synergy.human"],
  ["warrior", "synergy.warrior"],
  ["knight", "synergy.knight"],
];

/**
 * High-precision creature-type suggestions. Deliberately does not add the
 * broad `synergy.tribal` strategy tag.
 */
export function kindredTagsFromTypeLine(typeLine: string): string[] {
  if (!/\bcreature\b/i.test(typeLine)) return [];

  const tags: string[] = [];
  for (const [creatureType, tagId] of KINDRED_TAGS) {
    if (new RegExp(`\\b${creatureType}\\b`, "i").test(typeLine)) {
      tags.push(tagId);
    }
  }
  return tags;
}
