import { DeckListSkeleton } from "@/components/shared/skeletons";

export default function DecksLoading() {
  return (
    <div className="flex flex-col gap-6" data-testid="decks-route-loading">
      <div className="bg-muted border-border h-8 w-40 animate-pulse border" />
      <DeckListSkeleton />
    </div>
  );
}
