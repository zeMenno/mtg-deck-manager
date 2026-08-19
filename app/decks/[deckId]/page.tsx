import { Suspense } from "react";

import { DeckDashboardClient } from "@/components/deck/deck-dashboard-client";
import { DeckDashboardSkeleton } from "@/components/shared/skeletons";

type PageProps = {
  params: Promise<{ deckId: string }>;
};

export default function DeckDashboardPage({ params }: PageProps) {
  return (
    <Suspense fallback={<DeckDashboardSkeleton />}>
      <DeckDashboardClient params={params} />
    </Suspense>
  );
}
