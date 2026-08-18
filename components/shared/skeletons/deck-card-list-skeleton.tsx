import { Skeleton } from "@/components/ui/skeleton";

/** Ten compact-mode card rows. */
export function DeckCardListSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <ul
      className="flex flex-col gap-2"
      data-testid="deck-card-list-skeleton"
      aria-busy="true"
      aria-label="Loading cards"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <li
          key={i}
          className="border-border flex min-h-11 items-center gap-3 border-2 px-3 py-2"
        >
          <Skeleton className="h-4 w-8 shrink-0" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-5 w-16 shrink-0" />
        </li>
      ))}
    </ul>
  );
}
