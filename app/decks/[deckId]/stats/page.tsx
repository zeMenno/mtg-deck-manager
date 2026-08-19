import { Suspense } from "react";

import { DeckStatsClient } from "@/components/deck/deck-stats-client";
import { DeckDashboardSkeleton } from "@/components/shared/skeletons";

type PageProps = {
  params: Promise<{ deckId: string }>;
};

export default function DeckStatsRoutePage({ params }: PageProps) {
  return (
    <Suspense fallback={<DeckDashboardSkeleton />}>
      <DeckStatsClient params={params} />
    </Suspense>
  );
}
