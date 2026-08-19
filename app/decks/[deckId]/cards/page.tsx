import { Suspense } from "react";

import { DeckCardsClient } from "@/components/deck/deck-cards-client";
import { DeckCardListSkeleton } from "@/components/shared/skeletons";

type PageProps = {
  params: Promise<{ deckId: string }>;
};

export default function DeckCardsPage({ params }: PageProps) {
  return (
    <Suspense fallback={<DeckCardListSkeleton />}>
      <DeckCardsClient params={params} />
    </Suspense>
  );
}
