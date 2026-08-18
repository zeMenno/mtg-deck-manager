import { Suspense } from "react";

import { VersionDetailPageClient } from "@/components/deck/version-detail-page-client";

type PageProps = {
  params: Promise<{ deckId: string; versionId: string }>;
};

export default function VersionDetailPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={<p className="font-mono text-sm uppercase">Loading version…</p>}
    >
      <VersionDetailPageClient params={params} />
    </Suspense>
  );
}
