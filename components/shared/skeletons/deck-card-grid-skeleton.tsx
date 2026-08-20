import { Skeleton } from "@/components/ui/skeleton";
import { GRID_COLUMNS_CLASS } from "@/lib/display/grid-classes";

/** Eight grid tiles for deck card loading. */
export function DeckCardGridSkeleton({ tiles = 8 }: { tiles?: number }) {
  return (
    <div
      className={GRID_COLUMNS_CLASS}
      data-testid="deck-card-grid-skeleton"
      aria-busy="true"
      aria-label="Loading cards"
    >
      {Array.from({ length: tiles }).map((_, i) => (
        <div
          key={i}
          className="border-border overflow-hidden rounded-md border"
        >
          <Skeleton className="aspect-[488/680] w-full" />
          <div className="flex flex-col gap-1 p-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
