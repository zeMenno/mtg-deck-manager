import { Skeleton } from "@/components/ui/skeleton";

export function SettingsSkeleton() {
  return (
    <div
      className="flex flex-col gap-4"
      data-testid="settings-skeleton"
      aria-busy="true"
      aria-label="Loading settings"
    >
      <Skeleton className="h-8 w-36" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}
