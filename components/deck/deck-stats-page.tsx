"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { DeckColorChart } from "@/components/deck/deck-color-chart";
import { DeckDistributionChart } from "@/components/deck/deck-distribution-chart";
import { DeckManaCurveChart } from "@/components/deck/deck-mana-curve-chart";
import {
  DeckRoleTable,
  DeckSynergyTable,
} from "@/components/deck/deck-role-table";
import { DeckSizeBadge } from "@/components/deck/deck-size-badge";
import { DeckStatusSummary } from "@/components/deck/deck-status-summary";
import { DeckCheckSummary } from "@/components/deck/deck-check-summary";
import { DeckWarningList } from "@/components/deck/deck-warning-list";
import { DeckDashboardSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import type { StatsMode } from "@/lib/deck/stats";
import { useDeck } from "@/lib/hooks/use-deck";
import { useDeckStats } from "@/lib/hooks/use-deck-stats";
import { useDeckWarnings } from "@/lib/hooks/use-deck-warnings";
import { cn } from "@/lib/utils";

type DeckStatsPageProps = {
  deckId: string;
};

export function DeckStatsPage({ deckId }: DeckStatsPageProps) {
  const [mode, setMode] = useState<StatsMode>("current");
  const { deck, isLoading: deckLoading } = useDeck(deckId);
  const { stats, isLoading, isEmpty } = useDeckStats(deckId, mode);
  const { warnings, summary } = useDeckWarnings(deckId, mode);

  if (deckLoading || isLoading) {
    return <DeckDashboardSkeleton />;
  }

  if (!deck) {
    return (
      <div className="flex flex-col gap-4">
        <p className="font-bold">Deck not found</p>
        <Button asChild variant="outline">
          <Link href="/decks">Back to decks</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="deck-stats-page">
      <header className="border-border sticky top-0 z-10 -mx-1 flex items-center gap-2 border-b-4 bg-[var(--background)] px-1 py-3">
        <Button asChild variant="ghost" size="icon" aria-label="Back to deck">
          <Link href={`/decks/${deckId}`}>
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-black uppercase">{deck.name}</h1>
          <p className="text-muted-foreground font-mono text-xs uppercase">
            Statistics
          </p>
        </div>
      </header>

      <div
        className="border-border flex gap-1 border-2 p-1"
        role="group"
        aria-label="Stats mode"
        data-testid="stats-mode-toggle"
      >
        {(["current", "projected"] as const).map((value) => (
          <button
            key={value}
            type="button"
            data-testid={`stats-mode-${value}`}
            onClick={() => setMode(value)}
            className={cn(
              "flex-1 px-3 py-2 text-xs font-bold uppercase",
              mode === value
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )}
          >
            {value}
          </button>
        ))}
      </div>
      <p className="text-muted-foreground text-xs">
        {mode === "current"
          ? "Current: cards marked CURRENT (excluding maybeboard)."
          : "Projected: CURRENT + ADD, excluding CUT (Phase 7 preview)."}
      </p>

      {isEmpty || !stats ? (
        <div
          className="border-border flex flex-col gap-3 border-2 p-6"
          data-testid="stats-empty"
        >
          <p className="font-bold">Add cards to see statistics</p>
          <Button asChild>
            <Link href={`/decks/${deckId}/cards`}>Edit cards</Link>
          </Button>
        </div>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="font-mono text-xs font-bold uppercase">Deck size</h2>
            <DeckSizeBadge counts={stats.counts} />
            <dl className="grid grid-cols-2 gap-2 font-mono text-xs uppercase sm:grid-cols-4">
              <div className="border-border border-2 p-2">
                <dt className="text-muted-foreground">Commander</dt>
                <dd className="text-lg font-black">{stats.counts.commander}</dd>
              </div>
              <div className="border-border border-2 p-2">
                <dt className="text-muted-foreground">Mainboard</dt>
                <dd className="text-lg font-black">{stats.counts.mainboard}</dd>
              </div>
              <div className="border-border border-2 p-2">
                <dt className="text-muted-foreground">Sideboard</dt>
                <dd className="text-lg font-black">{stats.counts.sideboard}</dd>
              </div>
              <div className="border-border border-2 p-2">
                <dt className="text-muted-foreground">Maybeboard</dt>
                <dd className="text-lg font-black">
                  {stats.counts.maybeboard}
                </dd>
              </div>
            </dl>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-mono text-xs font-bold uppercase">
              Mana curve
            </h2>
            <DeckManaCurveChart
              buckets={stats.manaCurve}
              averageManaValue={stats.averageManaValue}
            />
          </section>

          <DeckDistributionChart
            items={stats.typeDistribution}
            title="Card types"
            testId="stats-type-chart"
          />

          <DeckColorChart distribution={stats.colorDistribution} />

          <DeckRoleTable items={stats.roleDistribution} />
          <DeckSynergyTable items={stats.synergyDistribution} />

          <section className="flex flex-col gap-2">
            <h2 className="font-mono text-xs font-bold uppercase">
              Status breakdown
            </h2>
            <DeckStatusSummary counts={stats.statusCounts} deckId={deckId} />
            <p className="font-mono text-xs uppercase">
              Current {stats.statusCounts.current} · Mana sources (Ramp){" "}
              {stats.manaSources} · Lands {stats.landCount}
            </p>
          </section>

          <div id="warnings" className="flex flex-col gap-3">
            <DeckCheckSummary summary={summary} />
            <DeckWarningList
              warnings={warnings}
              title={
                mode === "projected"
                  ? "Projected deck check"
                  : "Full deck check"
              }
              grouped
            />
            <p className="text-muted-foreground text-xs">
              Offline notes: cards without cached Scryfall legalities show a
              warning, not a legality error. Refresh cards when online to verify
              bans.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
