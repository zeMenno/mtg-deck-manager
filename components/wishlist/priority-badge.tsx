"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PRIORITY_LABELS } from "@/types/wishlist";
import type { WishlistPriority } from "@/types";

const PRIORITY_STYLES: Record<WishlistPriority, string> = {
  essential: "bg-red-500 text-white border-red-800",
  high: "bg-orange-500 text-white border-orange-700",
  medium: "bg-yellow-400 text-black border-yellow-600",
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
