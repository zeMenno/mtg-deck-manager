import { Suspense } from "react";

import { VersionDetailPageClient } from "@/components/deck/version-detail-page-client";
import { DeckDashboardSkeleton } from "@/components/shared/skeletons";

type PageProps = {
  params: Promise<{ deckId: string; versionId: string }>;
};

export default function VersionDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<DeckDashboardSkeleton />}>
      <VersionDetailPageClient params={params} />
    </Suspense>
  );
}
