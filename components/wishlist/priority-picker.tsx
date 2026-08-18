"use client";

import { Button } from "@/components/ui/button";
import { PRIORITY_LABELS, ALL_PRIORITIES } from "@/types/wishlist";
import type { WishlistPriority } from "@/types";
import { cn } from "@/lib/utils";

type PriorityPickerProps = {
  value: WishlistPriority;
  onChange: (priority: WishlistPriority) => void;
  className?: string;
};

export function PriorityPicker({
  value,
  onChange,
  className,
}: PriorityPickerProps) {
  return (
    <div
      className={cn("flex flex-wrap gap-2", className)}
      role="group"
      aria-label="Priority"
      data-testid="priority-picker"
    >
      {ALL_PRIORITIES.map((priority) => (
        <Button
          key={priority}
          type="button"
          size="sm"
          variant={value === priority ? "default" : "outline"}
          data-testid={`priority-option-${priority}`}
          aria-pressed={value === priority}
          onClick={() => onChange(priority)}
          className="min-h-11"
        >
          {PRIORITY_LABELS[priority]}
        </Button>
      ))}
    </div>
  );
}
