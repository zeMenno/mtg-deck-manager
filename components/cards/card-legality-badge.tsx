"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CardLegality } from "@/types/card";

const LABEL: Record<CardLegality, string> = {
  legal: "Legal",
  not_legal: "Not legal",
  banned: "Banned",
  restricted: "Restricted",
};

type CardLegalityBadgeProps = {
  legality: CardLegality;
  className?: string;
};

export function CardLegalityBadge({
  legality,
  className,
}: CardLegalityBadgeProps) {
  const variant =
    legality === "legal"
      ? "default"
      : legality === "banned"
        ? "destructive"
        : legality === "restricted"
          ? "secondary"
          : "outline";

  return (
    <Badge
      variant={variant}
      className={cn(
        legality === "restricted" && "bg-warning text-warning-foreground",
        className,
      )}
      data-testid={`legality-badge-${legality}`}
    >
      {LABEL[legality]}
    </Badge>
  );
}
