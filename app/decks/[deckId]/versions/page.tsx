import { Suspense } from "react";

import { DeckVersionsPageClient } from "@/components/deck/deck-versions-page-client";

type PageProps = {
  params: Promise<{ deckId: string }>;
};

export default function DeckVersionsPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <p className="font-mono text-sm uppercase">Loading versions…</p>
      }
    >
      <DeckVersionsPageClient params={params} />
    </Suspense>
  );
}
