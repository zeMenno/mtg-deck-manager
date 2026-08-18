import { Skeleton } from "@/components/ui/skeleton";

export function WishlistSkeleton() {
  return (
    <div
      className="flex flex-col gap-4"
      data-testid="wishlist-skeleton"
      aria-busy="true"
      aria-label="Loading wishlist"
    >
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-24 w-full" />
      <ul className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i}>
            <Skeleton className="h-20 w-full" />
          </li>
        ))}
      </ul>
    </div>
  );
}
