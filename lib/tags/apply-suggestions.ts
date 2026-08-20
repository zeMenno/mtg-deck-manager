import type { DeckBuilderDatabase } from "@/lib/db/database";
import { getDatabase } from "@/lib/db/database";
import {
  CardRepository,
  DeckCardRepository,
  DeckRepository,
} from "@/lib/db/repositories";
import { DeckCardService } from "@/lib/deck/deck-service";
import { suggestTags, type TagSuggestionReason } from "@/lib/tags/suggest-tags";

export type SuggestionApplyPolicy = "untagged" | "fill-empty" | "replace";

export type DeckTagSuggestionRow = {
  deckCardId: string;
  cardId: string;
  cardName: string;
  currentRoles: string[];
  currentSynergies: string[];
  suggestedRoles: string[];
  suggestedSynergies: string[];
  nextRoles: string[];
  nextSynergies: string[];
  reasons: TagSuggestionReason[];
};

export type DeckTagSuggestionPreview = {
  deckId: string;
  deckName: string;
  policy: SuggestionApplyPolicy;
  rows: DeckTagSuggestionRow[];
  skippedTagged: number;
  noSuggestions: number;
};

function union(left: string[], right: string[]): string[] {
  return [...new Set([...left, ...right])];
}

function nextTags(
  currentRoles: string[],
  currentSynergies: string[],
  suggestedRoles: string[],
  suggestedSynergies: string[],
  policy: SuggestionApplyPolicy,
): { roles: string[]; synergies: string[] } | null {
  if (
    policy === "untagged" &&
    (currentRoles.length > 0 || currentSynergies.length > 0)
  ) {
    return null;
  }
  if (policy === "replace") {
    return { roles: suggestedRoles, synergies: suggestedSynergies };
  }
  if (policy === "fill-empty") {
    return {
      roles:
        currentRoles.length === 0
          ? union(currentRoles, suggestedRoles)
          : currentRoles,
      synergies:
        currentSynergies.length === 0
          ? union(currentSynergies, suggestedSynergies)
          : currentSynergies,
    };
  }
  return {
    roles: union(currentRoles, suggestedRoles),
    synergies: union(currentSynergies, suggestedSynergies),
  };
}

export async function previewDeckTagSuggestions(
  deckId: string,
  policy: SuggestionApplyPolicy = "untagged",
  database: DeckBuilderDatabase = getDatabase(),
): Promise<DeckTagSuggestionPreview> {
  const decks = new DeckRepository(database);
  const deck = await decks.getById(deckId);
  if (!deck) throw new Error(`Deck not found: ${deckId}`);

  const deckCards = await new DeckCardRepository(database).listByDeck(deckId);
  const cards = await new CardRepository(database).getByIds(
    deckCards.map((row) => row.cardId),
  );
  const cardsById = new Map(cards.map((card) => [card.id, card]));

  const rows: DeckTagSuggestionRow[] = [];
  let skippedTagged = 0;
  let noSuggestions = 0;

  for (const deckCard of deckCards) {
    const card = cardsById.get(deckCard.cardId);
    if (!card) continue;
    const suggestion = suggestTags(card);
    if (suggestion.roles.length === 0 && suggestion.synergies.length === 0) {
      noSuggestions += 1;
      continue;
    }
    const next = nextTags(
      deckCard.roles,
      deckCard.synergies,
      suggestion.roles,
      suggestion.synergies,
      policy,
    );
    if (!next) {
      skippedTagged += 1;
      continue;
    }
    if (
      next.roles.join("|") === deckCard.roles.join("|") &&
      next.synergies.join("|") === deckCard.synergies.join("|")
    ) {
      skippedTagged += 1;
      continue;
    }

    rows.push({
      deckCardId: deckCard.id,
      cardId: card.id,
      cardName: card.name,
      currentRoles: deckCard.roles,
      currentSynergies: deckCard.synergies,
      suggestedRoles: suggestion.roles,
      suggestedSynergies: suggestion.synergies,
      nextRoles: next.roles,
      nextSynergies: next.synergies,
      reasons: suggestion.reasons,
    });
  }

  return {
    deckId,
    deckName: deck.name,
    policy,
    rows,
    skippedTagged,
    noSuggestions,
  };
}

export async function applyDeckTagSuggestions(
  preview: DeckTagSuggestionPreview,
  selectedDeckCardIds: string[],
  database: DeckBuilderDatabase = getDatabase(),
): Promise<number> {
  const selected = new Set(selectedDeckCardIds);
  const service = new DeckCardService(database);
  let applied = 0;

  for (const row of preview.rows) {
    if (!selected.has(row.deckCardId)) continue;
    await service.updateDeckCard(row.deckCardId, {
      roles: row.nextRoles,
      synergies: row.nextSynergies,
    });
    applied += 1;
  }

  return applied;
}
