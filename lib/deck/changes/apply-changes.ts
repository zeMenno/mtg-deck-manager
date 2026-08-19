/**
 * Apply Changes — atomic ADD→CURRENT promotion and CUT deletion.
 */

import type { DeckBuilderDatabase } from "@/lib/db/database";
import { getDatabase } from "@/lib/db/database";
import { nowIso } from "@/lib/db/ids";
import { DeckCardRepository } from "@/lib/db/repositories/deck-card-repository";
import { DeckRepository } from "@/lib/db/repositories/deck-repository";
import {
  canApply,
  computeChangeSummary,
} from "@/lib/deck/changes/change-summary";
import { computeProjectedCounts } from "@/lib/deck/changes/projected-deck";
import type {
  ApplyChangesResult,
  ApplyValidation,
  ApplyValidationIssue,
  OnApplyComplete,
} from "@/lib/deck/changes/types";
import { computeDeckSize } from "@/lib/deck/stats/deck-size";
import { withResolvedCards } from "@/lib/deck/stats/filters";
import { getCardsByIdsBatched } from "@/lib/cards/get-cards-by-ids-batched";
import { deckValidationService } from "@/lib/services/deck-validation-service";
import type { DeckWarning } from "@/types/deck-validation";
import type { Deck, DeckCard, DeckCardWithCard } from "@/types/deck";

export type ValidateBeforeApplyInput = {
  deck: Deck;
  deckCards: DeckCard[];
  /** Optional pre-joined cards; fetched if omitted. */
  cards?: DeckCardWithCard[];
};

function deckWarningsToApplyIssues(
  warnings: DeckWarning[],
): ApplyValidationIssue[] {
  return warnings
    .filter((w) => w.severity !== "success")
    .map((w) => ({
      id: w.id,
      severity:
        w.category === "LEGALITY" && w.severity === "error"
          ? ("error" as const)
          : ("warning" as const),
      message: w.message,
    }));
}

export function validateBeforeApply(
  input: ValidateBeforeApplyInput,
): ApplyValidation {
  const { deck, deckCards } = input;
  const pending = canApply(deckCards);

  const size = computeDeckSize(deck, deckCards, "projected");
  const projectedTotal = size.total;
  const projectedTarget = size.target;

  const cardMap = input.cards
    ? new Map(input.cards.map((c) => [c.cardId, c.card]))
    : undefined;

  const projectedWarnings = deckValidationService.validateProjectedSync({
    deck,
    deckCards,
    cards: cardMap,
  });

  const issues = deckWarningsToApplyIssues(projectedWarnings);

  const summary = computeChangeSummary(deckCards);
  const unpairedAdds = deckCards.filter(
    (c) => c.status === "add" && !c.replacesDeckCardId,
  );
  if (unpairedAdds.length > 0 && summary.cutCount > 0) {
    issues.push({
      id: "unpaired-adds",
      severity: "warning",
      message: `${unpairedAdds.length} ADD card(s) have no replacement link.`,
    });
  }

  // Prefer legacy projected-over-size id for existing tests / UX copy.
  if (deck.format === "commander" && projectedTotal > projectedTarget) {
    const over = projectedTotal - projectedTarget;
    const idx = issues.findIndex(
      (i) => i.id === "deck-size" || i.id === "projected-over-size",
    );
    const message = `Projected deck has ${projectedTotal} cards. Remove ${over} ADD or add ${over} CUT before applying.`;
    if (idx >= 0) {
      issues[idx] = {
        id: "projected-over-size",
        severity: "error",
        message,
      };
    } else {
      issues.unshift({
        id: "projected-over-size",
        severity: "error",
        message,
      });
    }
  }

  const hasBlocking = issues.some((i) => i.severity === "error");

  return {
    ok: !hasBlocking,
    canApply: pending && !hasBlocking,
    issues,
    projectedTotal,
    projectedTarget,
  };
}

export type ApplyChangesOptions = {
  onApplyComplete?: OnApplyComplete;
  /** Skip size validation (tests only). */
  skipValidation?: boolean;
};

export class ApplyChangesService {
  constructor(
    private readonly database: DeckBuilderDatabase = getDatabase(),
    private readonly deckCards = new DeckCardRepository(database),
    private readonly decks = new DeckRepository(database),
  ) {}

  async applyChanges(
    deckId: string,
    options: ApplyChangesOptions = {},
  ): Promise<ApplyChangesResult> {
    const deck = await this.decks.getById(deckId);
    if (!deck) {
      throw new Error(`Deck not found: ${deckId}`);
    }

    const cards = await this.deckCards.listByDeck(deckId);
    if (!canApply(cards)) {
      return {
        promotedCount: 0,
        removedCount: 0,
        appliedAt: nowIso(),
        errors: ["No pending ADD or CUT changes to apply"],
      };
    }

    if (!options.skipValidation) {
      const cardIds = cards.map((c) => c.cardId);
      const metadata = await getCardsByIdsBatched(cardIds);
      const joined = withResolvedCards(
        cards,
        new Map(metadata.map((c) => [c.id, c])),
      );
      const validation = validateBeforeApply({
        deck,
        deckCards: cards,
        cards: joined,
      });
      if (!validation.canApply) {
        const errors = validation.issues
          .filter((i) => i.severity === "error")
          .map((i) => i.message);
        return {
          promotedCount: 0,
          removedCount: 0,
          appliedAt: nowIso(),
          errors:
            errors.length > 0
              ? errors
              : ["Cannot apply changes due to validation errors"],
        };
      }
    }

    const result = await this.database.transaction(
      "rw",
      this.database.deckCards,
      this.database.decks,
      async () => {
        const latest = await this.deckCards.listByDeck(deckId);
        const toPromote = latest.filter((c) => c.status === "add");
        const toRemove = latest.filter((c) => c.status === "cut");
        const removeIds = toRemove.map((c) => c.id);

        for (const card of toPromote) {
          await this.deckCards.update(card.id, {
            status: "current",
            replacesDeckCardId: undefined,
          });
        }

        for (const card of toRemove) {
          await this.deckCards.delete(card.id);
        }

        if (removeIds.length > 0) {
          await this.deckCards.clearReplacementsPointingTo(removeIds);
        }

        await this.decks.update(deckId, {});

        return {
          promotedCount: toPromote.length,
          removedCount: toRemove.length,
          appliedAt: nowIso(),
        } satisfies ApplyChangesResult;
      },
    );

    if (options.onApplyComplete) {
      await options.onApplyComplete(result);
    }

    return result;
  }

  getPreviewCounts(deckCards: DeckCard[]) {
    return {
      summary: computeChangeSummary(deckCards),
      projected: computeProjectedCounts(deckCards),
    };
  }
}

export const applyChangesService = new ApplyChangesService();

export async function applyChanges(
  deckId: string,
  options?: ApplyChangesOptions,
): Promise<ApplyChangesResult> {
  return applyChangesService.applyChanges(deckId, options);
}
