"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DeckCardStatus } from "@/types";

const STATUS_STYLES: Record<
  DeckCardStatus,
  { label: string; className: string }
> = {
  current: {
    label: "Current",
    className: "bg-status-current text-status-current-foreground border-border",
  },
  add: {
    label: "Add",
    className: "bg-status-add text-status-add-foreground border-border",
  },
  cut: {
    label: "Cut",
    className: "bg-status-cut text-status-cut-foreground border-border",
  },
  consider: {
    label: "Consider",
    className:
      "bg-status-consider text-status-consider-foreground border-border",
  },
};

type DeckStatusBadgeProps = {
  status: DeckCardStatus;
  className?: string;
  /** Brief scale pulse when status updates (respects reduced motion via CSS). */
  pulse?: boolean;
};

export function DeckStatusBadge({
  status,
  className,
  pulse,
}: DeckStatusBadgeProps) {
  const style = STATUS_STYLES[status];
  return (
    <Badge
      data-testid={`status-badge-${status}`}
      aria-label={`Status: ${style.label}`}
      className={cn(
        style.className,
        pulse && "animate-status-pulse",
        className,
      )}
    >
      {style.label}
    </Badge>
  );
}
