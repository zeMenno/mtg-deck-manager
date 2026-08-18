import { Suspense } from "react";

import { DeckStatsClient } from "@/components/deck/deck-stats-client";

type PageProps = {
  params: Promise<{ deckId: string }>;
};

export default function DeckStatsRoutePage({ params }: PageProps) {
  return (
    <Suspense
      fallback={<p className="font-mono text-sm uppercase">Loading stats…</p>}
    >
      <DeckStatsClient params={params} />
    </Suspense>
  );
}
