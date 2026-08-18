import { Suspense } from "react";

import { VersionComparePageClient } from "@/components/deck/versions/version-compare-page-client";

type PageProps = {
  params: Promise<{ deckId: string }>;
};

export default function VersionComparePage({ params }: PageProps) {
  return (
    <Suspense
      fallback={<p className="font-mono text-sm uppercase">Loading compare…</p>}
    >
      <VersionComparePageClient params={params} />
    </Suspense>
  );
}
