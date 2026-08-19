"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  computeChangeSummary,
  ReplacementLinkService,
  validateBeforeApply,
} from "@/lib/deck/changes";
import type { ApplyValidation } from "@/lib/deck/changes";
import { formatCurrency } from "@/lib/pricing/format-price";
import type { ValuationResult } from "@/lib/pricing/types";
import type { Currency } from "@/types";
import type { Deck, DeckCardWithCard } from "@/types/deck";

type ApplyChangesReviewProps = {
  deck: Deck;
  cards: DeckCardWithCard[];
  validation: ApplyValidation;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  /** Phase 11 stub — disabled checkbox. */
  saveSnapshotStub?: boolean;
  upgradeCost?: ValuationResult;
  currency?: Currency;
};

export function ApplyChangesReview({
  deck,
  cards,
  validation,
  pending = false,
  onCancel,
  onConfirm,
  saveSnapshotStub = true,
  upgradeCost,
  currency = "USD",
}: ApplyChangesReviewProps) {
  const summary = useMemo(() => computeChangeSummary(cards), [cards]);
  const adds = useMemo(() => cards.filter((c) => c.status === "add"), [cards]);
  const cuts = useMemo(() => cards.filter((c) => c.status === "cut"), [cards]);
  const pairs = useMemo(
    () => new ReplacementLinkService().getReplacementPairs(cards),
    [cards],
  );
  const pairedAddIds = useMemo(
    () => new Set(pairs.map((p) => p.add.id)),
    [pairs],
  );
  const pairedCutIds = useMemo(
    () => new Set(pairs.map((p) => p.cut.id)),
    [pairs],
  );
  const unpairedAdds = adds.filter((a) => !pairedAddIds.has(a.id));
  const unpairedCuts = cuts.filter((c) => !pairedCutIds.has(c.id));

  const cardName = (id: string) =>
    cards.find((c) => c.id === id)?.card.name ?? "Unknown";

  const upgradeCostLabel =
    upgradeCost?.total != null
      ? `Upgrade cost: ${formatCurrency(upgradeCost.total, currency)}${
          upgradeCost.pricedCount < upgradeCost.totalCount
            ? ` (${upgradeCost.pricedCount} of ${upgradeCost.totalCount} priced)`
            : ""
        }`
      : "Upgrade cost: Price unavailable";

  return (
    <div className="flex flex-col gap-5" data-testid="apply-changes-review">
      <div>
        <h2 className="text-xl font-black uppercase">Apply changes?</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          +{summary.addCount} cards will be added (ADD → CURRENT)
          <br />−{summary.cutCount} cards will be removed (CUT deleted)
        </p>
        <p className="mt-2 font-mono text-sm">
          Projected: {validation.projectedTotal}/{validation.projectedTarget}{" "}
          {validation.projectedTotal === validation.projectedTarget ? "✓" : ""}
        </p>
        <p
          className="text-muted-foreground mt-1 text-xs"
          data-testid="apply-upgrade-cost"
        >
          {upgradeCostLabel}
        </p>
      </div>

      {validation.issues.length > 0 ? (
        <ul className="flex flex-col gap-1" data-testid="apply-validation">
          {validation.issues.map((issue) => (
            <li
              key={issue.id}
              className={
                issue.severity === "error"
                  ? "text-destructive text-sm font-bold"
                  : "text-sm text-amber-700 dark:text-amber-400"
              }
            >
              {issue.message}
            </li>
          ))}
        </ul>
      ) : null}

      {pairs.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h3 className="font-mono text-xs uppercase">Replacements</h3>
          <ul className="flex flex-col gap-2">
            {pairs.map((pair) => (
              <li
                key={`${pair.add.id}-${pair.cut.id}`}
                className="border-border border p-2 text-sm"
                data-testid="replacement-pair"
              >
                <p>
                  <Badge variant="outline" className="mr-1">
                    OUT
                  </Badge>
                  {cardName(pair.cut.id)}
                </p>
                <p className="mt-1">
                  <Badge variant="outline" className="mr-1">
                    IN
                  </Badge>
                  {cardName(pair.add.id)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h3 className="font-mono text-xs uppercase">
            Adding ({unpairedAdds.length + pairs.length})
          </h3>
          <ul className="flex flex-col gap-1">
            {adds.map((card) => (
              <li key={card.id} className="text-sm font-bold">
                + {card.card.name}
              </li>
            ))}
            {adds.length === 0 ? (
              <li className="text-muted-foreground text-sm">None</li>
            ) : null}
          </ul>
        </section>
        <section className="flex flex-col gap-2">
          <h3 className="font-mono text-xs uppercase">
            Removing ({unpairedCuts.length + pairs.length})
          </h3>
          <ul className="flex flex-col gap-1">
            {cuts.map((card) => (
              <li key={card.id} className="text-sm font-bold">
                − {card.card.name}
              </li>
            ))}
            {cuts.length === 0 ? (
              <li className="text-muted-foreground text-sm">None</li>
            ) : null}
          </ul>
        </section>
      </div>

      {saveSnapshotStub ? (
        <label className="text-muted-foreground flex items-center gap-2 text-sm">
          <input type="checkbox" disabled data-testid="save-snapshot-stub" />
          Save version snapshot after apply (Phase 11)
        </label>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={pending}
          data-testid="apply-cancel-btn"
        >
          Cancel
        </Button>
        <Button
          type="button"
          data-testid="apply-changes-btn"
          disabled={!validation.canApply || pending}
          onClick={onConfirm}
        >
          {pending ? "Applying…" : "Apply changes"}
        </Button>
      </div>

      <p className="sr-only">Applying changes to {deck.name}</p>
    </div>
  );
}

/** Helper used by dialog to compute validation. */
export function buildApplyValidation(deck: Deck, cards: DeckCardWithCard[]) {
  return validateBeforeApply({ deck, deckCards: cards, cards });
}
