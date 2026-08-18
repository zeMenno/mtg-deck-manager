"use client";

import { useState } from "react";

import { ApplyChangesDialog } from "@/components/changes/apply-changes-dialog";
import { ChangesNavCard } from "@/components/changes/changes-nav-card";
import { Button } from "@/components/ui/button";
import { computeProjectedCounts } from "@/lib/deck/changes";
import { useDeckChanges } from "@/lib/hooks/use-deck-changes";
import { useDeckCards } from "@/lib/hooks/use-deck-cards";
import { useMemo } from "react";

type ChangesHubProps = {
  deckId: string;
};

export function ChangesHub({ deckId }: ChangesHubProps) {
  const { summary, isLoading } = useDeckChanges(deckId);
  const { cards } = useDeckCards(deckId);
  const [reviewOpen, setReviewOpen] = useState(false);

  const projected = useMemo(() => computeProjectedCounts(cards), [cards]);
  const base = `/decks/${deckId}/changes`;

  if (isLoading) {
    return <p className="font-mono text-sm uppercase">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-4" data-testid="changes-hub">
      <div className="border-border bg-card flex flex-wrap items-center justify-between gap-2 border-2 p-3">
        <p className="font-mono text-xs uppercase">
          Projected {projected.projectedQuantity} cards · {summary.addCount} add
          · {summary.cutCount} cut · {summary.considerCount} consider
        </p>
        <Button
          type="button"
          data-testid="open-apply-changes-btn"
          disabled={!summary.hasPendingChanges}
          onClick={() => setReviewOpen(true)}
        >
          Apply changes
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <ChangesNavCard
          href={`${base}/add`}
          title="Need to add"
          count={summary.addCount}
          description="Cards marked ADD to acquire"
          testId="changes-nav-add"
        />
        <ChangesNavCard
          href={`${base}/cut`}
          title="Cards to cut"
          count={summary.cutCount}
          description="Cards marked CUT to remove"
          testId="changes-nav-cut"
        />
        <ChangesNavCard
          href={`${base}/consider`}
          title="Considering"
          count={summary.considerCount}
          description="Evaluation queue"
          testId="changes-nav-consider"
        />
        <ChangesNavCard
          href={`${base}/projected`}
          title="Projected deck"
          description={`CURRENT + ADD − CUT = ${projected.projectedQuantity}`}
          testId="changes-nav-projected"
        />
      </div>

      <ApplyChangesDialog
        deckId={deckId}
        open={reviewOpen}
        onOpenChange={setReviewOpen}
      />
    </div>
  );
}
