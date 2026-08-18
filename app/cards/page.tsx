import type { Metadata } from "next";
import { Suspense } from "react";

import { CardsPageClient } from "@/components/cards/cards-page-client";

export const metadata: Metadata = {
  title: "Search Cards",
};

export default function CardsPage() {
  return (
    <Suspense
      fallback={<p className="font-mono text-sm uppercase">Loading search…</p>}
    >
      <CardsPageClient />
    </Suspense>
  );
}
