"use client";

import { Check, AlertTriangle, X, Info } from "lucide-react";

import { cn } from "@/lib/utils";
import type { WarningSeverity } from "@/types/deck-validation";

type WarningBadgeProps = {
  severity: WarningSeverity;
  count?: number;
  className?: string;
};

const META: Record<
  WarningSeverity,
  { label: string; icon: typeof Check; className: string }
> = {
  success: {
    label: "Pass",
    icon: Check,
    className: "bg-status-current text-status-current-foreground",
  },
  info: {
    label: "Recommendation",
    icon: Info,
    className: "bg-secondary text-secondary-foreground",
  },
  warn: {
    label: "Warning",
    icon: AlertTriangle,
    className: "bg-warning text-warning-foreground",
  },
  error: {
    label: "Legality",
    icon: X,
    className: "bg-destructive text-white",
  },
};

export function WarningBadge({
  severity,
  count,
  className,
}: WarningBadgeProps) {
  const meta = META[severity];
  const Icon = meta.icon;
  return (
    <span
      data-testid={`warning-badge-${severity}`}
      className={cn(
        "border-border inline-flex items-center gap-1 border-2 px-2 py-0.5 font-mono text-[10px] font-bold uppercase",
        meta.className,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {meta.label}
      {typeof count === "number" && count > 0 ? ` · ${count}` : null}
    </span>
  );
}
