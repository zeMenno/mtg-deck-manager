"use client";

import { WifiOff } from "lucide-react";

import { cn } from "@/lib/utils";

type OfflineSearchBannerProps = {
  className?: string;
  message?: string;
};

export function OfflineSearchBanner({
  className,
  message = "Searching cached cards only.",
}: OfflineSearchBannerProps) {
  return (
    <div
      role="status"
      data-testid="offline-search-banner"
      className={cn(
        "border-border bg-secondary text-secondary-foreground flex items-center gap-2 border-2 px-3 py-2 text-xs font-bold uppercase",
        className,
      )}
    >
      <WifiOff aria-hidden="true" className="size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
