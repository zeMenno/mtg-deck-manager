import { Suspense } from "react";

import { DeckDashboardClient } from "@/components/deck/deck-dashboard-client";

type PageProps = {
  params: Promise<{ deckId: string }>;
};

export default function DeckDashboardPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={<p className="font-mono text-sm uppercase">Loading deck…</p>}
    >
      <DeckDashboardClient params={params} />
    </Suspense>
  );
}
