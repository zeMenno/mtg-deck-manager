"use client";

import { cn } from "@/lib/utils";

type SheetDragHandleProps = {
  className?: string;
};

/** Token-driven drag affordance for bottom sheets. */
export function SheetDragHandle({ className }: SheetDragHandleProps) {
  return (
    <div
      data-testid="sheet-drag-handle"
      aria-hidden="true"
      className={cn("flex justify-center pt-3 pb-1", className)}
    >
      <div className="bg-muted-foreground h-1.5 w-12 rounded-full" />
    </div>
  );
}
