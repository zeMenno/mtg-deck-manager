"use client";

import Link from "next/link";
import { use } from "react";
import { ArrowLeft } from "lucide-react";

import { NeedToAddList } from "@/components/changes/need-to-add-list";
import { DeckTabs } from "@/components/navigation/deck-tabs";
import { Button } from "@/components/ui/button";
import { useDeck } from "@/lib/hooks/use-deck";

type Props = { params: Promise<{ deckId: string }> };

export function ChangesAddPageClient({ params }: Props) {
  const { deckId } = use(params);
  const { deck, isLoading } = useDeck(deckId);

  if (isLoading) {
    return <p className="font-mono text-sm uppercase">Loading…</p>;
  }
  if (!deck) {
    return <p className="font-bold">Deck not found</p>;
  }

  return (
    <div className="flex flex-col gap-6" data-testid="changes-add-page">
      <div className="flex items-center gap-2">
        <Button
          asChild
          variant="ghost"
          size="icon"
          aria-label="Back to changes"
        >
          <Link href={`/decks/${deckId}/changes`}>
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-black uppercase">Need to add</h1>
      </div>
      <DeckTabs deckId={deckId} />
      <NeedToAddList deckId={deckId} />
    </div>
  );
}
