"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { VersionComparePicker } from "@/components/deck/versions/version-compare-picker";
import { Button } from "@/components/ui/button";
import { useDeck } from "@/lib/hooks/use-deck";

type VersionComparePageClientProps = {
  params: Promise<{ deckId: string }>;
};

export function VersionComparePageClient({
  params,
}: VersionComparePageClientProps) {
  const { deckId } = use(params);
  const { deck, isLoading } = useDeck(deckId);

  if (isLoading) {
    return <p className="font-mono text-sm uppercase">Loading compare…</p>;
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
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Button
          asChild
          variant="ghost"
          size="icon"
          aria-label="Back to versions"
        >
          <Link href={`/decks/${deckId}/versions`}>
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-black uppercase">
            Compare versions
          </h1>
          <p className="text-muted-foreground font-mono text-xs uppercase">
            {deck.name}
          </p>
        </div>
      </div>

      <VersionComparePicker deckId={deckId} />
    </div>
  );
}
