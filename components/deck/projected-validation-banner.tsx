"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  hasLegalityErrors,
  summarizeWarnings,
} from "@/lib/format/warning-utils";
import type { DeckWarning } from "@/types/deck-validation";
import { cn } from "@/lib/utils";

type ProjectedValidationBannerProps = {
  deckId: string;
  warnings: DeckWarning[];
  projectedTotal: number;
  projectedTarget: number;
  addQuantity?: number;
  cutQuantity?: number;
  className?: string;
};

export function ProjectedValidationBanner({
  deckId,
  warnings,
  projectedTotal,
  projectedTarget,
  addQuantity = 0,
  cutQuantity = 0,
  className,
}: ProjectedValidationBannerProps) {
  const illegal = hasLegalityErrors(warnings);
  const summary = summarizeWarnings(warnings);
  const sizeOk = projectedTotal === projectedTarget;
  const delta = projectedTarget - projectedTotal;

  return (
    <div
      data-testid="projected-validation-banner"
      className={cn(
        "border-border flex flex-col gap-2 border p-3",
        illegal
          ? "bg-destructive/15"
          : sizeOk
            ? "bg-status-current/20"
            : "bg-warning/20",
        className,
      )}
    >
      <p className="font-bold" data-testid="projected-banner-size">
        {sizeOk
          ? `Projected: ${projectedTotal} cards ✓`
          : delta > 0
            ? `Projected: ${projectedTotal} cards — ${delta} short`
            : `Projected: ${projectedTotal} cards — ${Math.abs(delta)} over`}
      </p>
      {addQuantity > 0 || cutQuantity > 0 ? (
        <p className="text-muted-foreground font-mono text-xs uppercase">
          +{addQuantity} adding · −{cutQuantity} cutting
        </p>
      ) : null}
      {illegal ? (
        <p className="text-destructive text-sm font-bold">
          ⚠ Projected deck illegal: {summary.errors} legality error
          {summary.errors === 1 ? "" : "s"}
        </p>
      ) : null}
      <Button asChild variant="outline" size="sm" className="self-start">
        <Link
          href={`/decks/${deckId}/stats#warnings`}
          data-testid="projected-banner-details"
        >
          View details
        </Link>
      </Button>
    </div>
  );
}
