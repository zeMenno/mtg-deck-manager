import { Suspense } from "react";

import { DeckCardsClient } from "@/components/deck/deck-cards-client";

type PageProps = {
  params: Promise<{ deckId: string }>;
};

export default function DeckCardsPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={<p className="font-mono text-sm uppercase">Loading cards…</p>}
    >
      <DeckCardsClient params={params} />
    </Suspense>
  );
}
