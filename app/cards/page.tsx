import type { Metadata } from "next";
import { Suspense } from "react";

import { CardsPageClient } from "@/components/cards/cards-page-client";
import { CardSearchSkeleton } from "@/components/shared/skeletons";

export const metadata: Metadata = {
  title: "Search Cards",
};

export default function CardsPage() {
  return (
    <Suspense fallback={<CardSearchSkeleton />}>
      <CardsPageClient />
    </Suspense>
  );
}
