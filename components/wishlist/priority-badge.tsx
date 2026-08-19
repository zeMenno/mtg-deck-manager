"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PRIORITY_LABELS } from "@/types/wishlist";
import type { WishlistPriority } from "@/types";

const PRIORITY_STYLES: Record<WishlistPriority, string> = {
  essential: "bg-destructive text-destructive-foreground border-destructive",
  high: "bg-status-consider text-status-consider-foreground border-border",
  medium: "bg-warning text-warning-foreground border-border",
  low: "bg-muted text-muted-foreground border-border",
};

type PriorityBadgeProps = {
  priority: WishlistPriority;
  className?: string;
};

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const label = PRIORITY_LABELS[priority];
  return (
    <Badge
      data-testid={`priority-badge-${priority}`}
      aria-label={`Priority: ${label}`}
      className={cn(PRIORITY_STYLES[priority], className)}
    >
      {label}
    </Badge>
  );
}
