import { Skeleton } from "@/components/ui/skeleton";

/** Header + stat widgets + chart placeholders for deck overview. */
export function DeckDashboardSkeleton() {
  return (
    <div
      className="flex flex-col gap-4"
      data-testid="deck-dashboard-skeleton"
      aria-busy="true"
      aria-label="Loading deck dashboard"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="size-14 shrink-0" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-7 w-1/2" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
