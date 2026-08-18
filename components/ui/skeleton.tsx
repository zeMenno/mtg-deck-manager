import { cn } from "@/lib/utils";

/**
 * Neo Brutalism skeleton primitive: square corners, hard border, pulse fill.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      data-testid="skeleton"
      className={cn(
        "bg-muted border-border animate-pulse rounded-none border-2",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
