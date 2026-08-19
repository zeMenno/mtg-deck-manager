import { Suspense } from "react";

import { VersionComparePageClient } from "@/components/deck/versions/version-compare-page-client";
import { DeckDashboardSkeleton } from "@/components/shared/skeletons";

type PageProps = {
  params: Promise<{ deckId: string }>;
};

export default function VersionComparePage({ params }: PageProps) {
  return (
    <Suspense fallback={<DeckDashboardSkeleton />}>
      <VersionComparePageClient params={params} />
    </Suspense>
  );
}
