import { DeckCardListSkeleton } from "@/components/shared/skeletons";

export default function DeckCardsLoading() {
  return (
    <div className="flex flex-col gap-4" data-testid="deck-cards-route-loading">
      <div className="bg-muted border-border h-8 w-1/2 animate-pulse border" />
      <DeckCardListSkeleton />
    </div>
  );
}
