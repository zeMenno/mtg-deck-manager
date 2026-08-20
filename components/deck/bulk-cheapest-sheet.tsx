"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { BulkCheapestScope } from "@/lib/deck/bulk-cheapest";
import { useBulkCheapest } from "@/lib/hooks/use-bulk-cheapest";
import { formatPrice } from "@/lib/pricing/format-price";

type BulkCheapestSheetProps = {
  deckId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const SCOPE_OPTIONS: Array<{ value: BulkCheapestScope; label: string }> = [
  { value: "add", label: "Need to add" },
  { value: "current-add", label: "Current + add" },
  { value: "all", label: "Entire deck" },
];

export function BulkCheapestSheet({
  deckId,
  open,
  onOpenChange,
}: BulkCheapestSheetProps) {
  const bulk = useBulkCheapest(deckId);
  const [scope, setScope] = useState<BulkCheapestScope>("add");
  const [includeOwned, setIncludeOwned] = useState(false);

  useEffect(() => {
    if (!open) {
      bulk.cancel();
      bulk.clearPreview();
    }
    // The hook methods are intentionally event-like; only sheet state drives this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const busy = bulk.plan.isPending || bulk.apply.isPending;
  const currency = bulk.currency;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        snap="tall"
        className="overflow-hidden"
        data-testid="bulk-cheapest-sheet"
      >
        <SheetHeader>
          <SheetTitle>Cheapest printings</SheetTitle>
          <SheetDescription>
            Preview filtered English paper printings before applying. Cancelling
            keeps rows already applied.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-wrap gap-2 px-4">
          {SCOPE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={scope === option.value ? "default" : "outline"}
              disabled={busy}
              onClick={() => setScope(option.value)}
            >
              {option.label}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant={includeOwned ? "default" : "outline"}
            disabled={busy}
            onClick={() => setIncludeOwned((value) => !value)}
          >
            Include owned
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => {
              void bulk.plan
                .mutateAsync({ scope, includeOwned })
                .catch(() => toast.error("Could not build cheapest preview"));
            }}
          >
            Build preview
          </Button>
        </div>

        {busy ? (
          <div className="px-4" role="status" aria-live="polite">
            <p className="font-mono text-sm">
              {bulk.progress.completed}/{bulk.progress.total}
            </p>
            <div
              className="bg-muted mt-2 h-2 overflow-hidden rounded-full"
              aria-hidden="true"
            >
              <div
                className="bg-primary h-full transition-[width]"
                style={{
                  width:
                    bulk.progress.total > 0
                      ? `${(bulk.progress.completed / bulk.progress.total) * 100}%`
                      : "0%",
                }}
              />
            </div>
          </div>
        ) : null}

        <div
          className="flex-1 overflow-y-auto px-4 pb-2"
          data-testid="bulk-cheapest-preview"
        >
          {!busy && bulk.plan.isSuccess && bulk.preview.length === 0 ? (
            <p className="text-muted-foreground py-6 text-sm">
              No cheaper priced printings were found for this scope.
            </p>
          ) : null}
          <div className="flex flex-col gap-2">
            {bulk.preview.map((row) => (
              <div
                key={row.deckCard.id}
                className="border-border rounded-md border p-3"
              >
                <p className="font-bold">{row.card.name}</p>
                <p className="text-muted-foreground font-mono text-xs">
                  {(row.fromPrinting.set ?? "—").toUpperCase()} #
                  {row.fromPrinting.collector_number ?? "—"} ·{" "}
                  {formatPrice(row.fromPrice, currency)}
                </p>
                <p className="font-mono text-xs">
                  → {(row.toPrinting.set ?? "—").toUpperCase()} #
                  {row.toPrinting.collector_number ?? "—"} ·{" "}
                  {formatPrice(row.toPrice, currency)}
                </p>
                <p className="text-muted-foreground text-xs">
                  {row.delta == null
                    ? "Savings unavailable (current price missing)"
                    : `Delta ${formatPrice(row.delta, currency)}`}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 px-4 pb-4">
          <Button
            type="button"
            variant="outline"
            data-testid="bulk-cheapest-cancel-btn"
            onClick={() => {
              if (busy) bulk.cancel();
              else onOpenChange(false);
            }}
          >
            {busy ? "Cancel" : "Close"}
          </Button>
          <Button
            type="button"
            data-testid="bulk-cheapest-apply-btn"
            disabled={busy || bulk.preview.length === 0}
            onClick={() => {
              void bulk.apply
                .mutateAsync()
                .then((result) => {
                  toast.success(
                    result.cancelled
                      ? `Cancelled after ${result.applied} changes`
                      : `Changed ${result.applied} printings`,
                  );
                  if (!result.cancelled) onOpenChange(false);
                })
                .catch(() => toast.error("Could not apply cheapest printings"));
            }}
          >
            Apply {bulk.preview.length || ""}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
