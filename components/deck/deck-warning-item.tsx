"use client";

import { useState } from "react";
import { Check, AlertTriangle, X, Info } from "lucide-react";

import { WarningBadge } from "@/components/deck/warning-badge";
import { cn } from "@/lib/utils";
import type { DeckWarning, WarningSeverity } from "@/types/deck-validation";

type DeckWarningItemProps = {
  warning: DeckWarning;
};

const SEVERITY_META: Record<
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

function categoryLabel(warning: DeckWarning): string {
  if (warning.severity === "success") return "Pass";
  if (warning.category === "LEGALITY") return "Legality";
  if (warning.category === "RECOMMENDATION") return "Recommendation";
  return "Warning";
}

export function DeckWarningItem({ warning }: DeckWarningItemProps) {
  const [open, setOpen] = useState(false);
  const meta = SEVERITY_META[warning.severity];
  const Icon = meta.icon;
  const hasDetails =
    Boolean(warning.details) ||
    (warning.cardIds !== undefined && warning.cardIds.length > 0);

  return (
    <li
      data-testid={`deck-warning-${warning.id}`}
      data-severity={warning.severity}
      data-category={warning.category}
      data-code={warning.code}
      className="border-border border-2"
    >
      <button
        type="button"
        className="flex w-full items-start gap-3 p-3 text-left"
        onClick={() => hasDetails && setOpen((v) => !v)}
        aria-expanded={hasDetails ? open : undefined}
      >
        <span
          className={cn(
            "border-border mt-0.5 inline-flex size-6 shrink-0 items-center justify-center border-2",
            meta.className,
          )}
          aria-hidden
        >
          <Icon className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="sr-only">{categoryLabel(warning)}: </span>
          <span className="font-bold">{warning.message}</span>
          <span className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase">
            <WarningBadge severity={warning.severity} />
            <span>{warning.code}</span>
          </span>
        </span>
      </button>
      {open && hasDetails ? (
        <div className="border-border text-muted-foreground border-t-2 px-3 py-2 text-sm">
          {warning.details ? <p>{warning.details}</p> : null}
          {warning.cardIds && warning.cardIds.length > 0 ? (
            <p className="mt-1 font-mono text-xs">
              Related cards: {warning.cardIds.length}
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
