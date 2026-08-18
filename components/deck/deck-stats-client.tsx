"use client";

import { use } from "react";

import { DeckStatsPage } from "@/components/deck/deck-stats-page";
import { DeckTabs } from "@/components/navigation/deck-tabs";

type DeckStatsClientProps = {
  params: Promise<{ deckId: string }>;
};

export function DeckStatsClient({ params }: DeckStatsClientProps) {
  const { deckId } = use(params);

  return (
    <div className="flex flex-col gap-4">
      <DeckTabs deckId={deckId} />
      <DeckStatsPage deckId={deckId} />
    </div>
  );
}
