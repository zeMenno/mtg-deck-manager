import { Skeleton } from "@/components/ui/skeleton";

/** Six placeholder deck rows matching DeckListItem layout. */
export function DeckListSkeleton() {
  return (
    <ul
      className="flex flex-col gap-3"
      data-testid="deck-list-skeleton"
      aria-busy="true"
      aria-label="Loading decks"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          className="border-border flex items-center gap-3 rounded-md border p-3 shadow-sm"
        >
          <Skeleton className="size-12 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="size-8 shrink-0" />
        </li>
      ))}
    </ul>
  );
}
