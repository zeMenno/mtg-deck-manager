import { Skeleton } from "@/components/ui/skeleton";

/** Search bar + five result rows. */
export function CardSearchSkeleton() {
  return (
    <div
      className="flex flex-col gap-3"
      data-testid="card-search-skeleton"
      aria-busy="true"
      aria-label="Loading search"
    >
      <Skeleton className="h-11 w-full" />
      <ul className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <li
            key={i}
            className="border-border flex items-center gap-3 border p-3"
          >
            <Skeleton className="size-12 shrink-0" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
