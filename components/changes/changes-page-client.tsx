"use client";

import Link from "next/link";
import { use } from "react";
import { ArrowLeft } from "lucide-react";

import { ChangesHub } from "@/components/changes/changes-hub";
import { DeckTabs } from "@/components/navigation/deck-tabs";
import { DeckDashboardSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { useDeck } from "@/lib/hooks/use-deck";

type ChangesPageClientProps = {
  params: Promise<{ deckId: string }>;
};

export function ChangesPageClient({ params }: ChangesPageClientProps) {
  const { deckId } = use(params);
  const { deck, isLoading } = useDeck(deckId);

  if (isLoading) {
    return <DeckDashboardSkeleton />;
  }

  if (!deck) {
    return (
      <div className="flex flex-col gap-4">
        <p className="font-bold">Deck not found</p>
        <Button asChild variant="outline">
          <Link href="/decks">Back to decks</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="changes-page">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="Back">
          <Link href={`/decks/${deckId}`}>
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-black uppercase">Changes</h1>
          <p className="text-muted-foreground font-mono text-xs uppercase">
            {deck.name}
          </p>
        </div>
      </div>

      <DeckTabs deckId={deckId} />
      <ChangesHub deckId={deckId} />
    </div>
  );
}
