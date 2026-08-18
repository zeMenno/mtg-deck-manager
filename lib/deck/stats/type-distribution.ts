/**
 * Card type distribution from Scryfall type lines.
 *
 * Decision: primary type before em dash; "Artifact Creature" → Creature.
 * Categories: Creature, Instant, Sorcery, Artifact, Enchantment,
 * Planeswalker, Land, Other.
 */

import type { DeckCardWithCard } from "@/types/deck";
import type { DistributionItem } from "@/lib/deck/stats/types";

const KNOWN_TYPES = [
  "Creature",
  "Instant",
  "Sorcery",
  "Artifact",
  "Enchantment",
  "Planeswalker",
  "Land",
] as const;

export type PrimaryType = (typeof KNOWN_TYPES)[number] | "Other";

/**
 * Parse the high-level type category from a type line.
 * Examples:
 * - "Legendary Creature — Human Soldier" → Creature
 * - "Artifact Creature — Construct" → Creature
 * - "Instant" → Instant
 * - "Land — Plains" → Land
 */
export function parsePrimaryType(typeLine: string): PrimaryType {
  if (!typeLine.trim()) return "Other";

  // Strip legendary prefix for matching.
  const match = typeLine.match(/^(?:Legendary\s+)?([\w\s]+?)(?:\s[—–-]|$)/i);
  const raw = (match?.[1] ?? typeLine).trim();

  // Artifact Creature (and Enchantment Creature, etc.) → Creature
  if (/\bCreature\b/i.test(raw)) {
    return "Creature";
  }
  if (/\bPlaneswalker\b/i.test(raw)) {
    return "Planeswalker";
  }
  if (/\bLand\b/i.test(raw)) {
    return "Land";
  }
  if (/\bInstant\b/i.test(raw)) {
    return "Instant";
  }
  if (/\bSorcery\b/i.test(raw)) {
    return "Sorcery";
  }
  if (/\bArtifact\b/i.test(raw)) {
    return "Artifact";
  }
  if (/\bEnchantment\b/i.test(raw)) {
    return "Enchantment";
  }

  return "Other";
}

export function computeTypeDistribution(
  cards: DeckCardWithCard[],
): DistributionItem[] {
  const counts = new Map<PrimaryType, number>();
  for (const type of [...KNOWN_TYPES, "Other"] as PrimaryType[]) {
    counts.set(type, 0);
  }

  for (const deckCard of cards) {
    const type = parsePrimaryType(deckCard.card.typeLine);
    counts.set(type, (counts.get(type) ?? 0) + deckCard.quantity);
  }

  const order: PrimaryType[] = [
    "Creature",
    "Instant",
    "Sorcery",
    "Artifact",
    "Enchantment",
    "Planeswalker",
    "Land",
    "Other",
  ];

  return order
    .map((id) => ({
      id,
      label: id,
      count: counts.get(id) ?? 0,
    }))
    .filter((item) => item.count > 0 || item.id === "Land");
}
