import { Suspense } from "react";

import { DeckVersionsPageClient } from "@/components/deck/deck-versions-page-client";
import { DeckDashboardSkeleton } from "@/components/shared/skeletons";

type PageProps = {
  params: Promise<{ deckId: string }>;
};

export default function DeckVersionsPage({ params }: PageProps) {
  return (
    <Suspense fallback={<DeckDashboardSkeleton />}>
      <DeckVersionsPageClient params={params} />
    </Suspense>
  );
}
