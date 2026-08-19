"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ReplacementLinkBadgeProps = {
  replacementName?: string;
  emptyLabel?: string;
  onPick?: () => void;
  onClear?: () => void;
  className?: string;
};

export function ReplacementLinkBadge({
  replacementName,
  emptyLabel = "Pick replacement",
  onPick,
  onClear,
  className,
}: ReplacementLinkBadgeProps) {
  if (replacementName) {
    return (
      <div
        className={cn("flex flex-wrap items-center gap-2", className)}
        data-testid="replacement-link-badge"
      >
        <Badge variant="outline" className="border-border border">
          → {replacementName}
        </Badge>
        {onClear ? (
          <Button
            type="button"
            size="xs"
            variant="ghost"
            data-testid="unlink-replacement-btn"
            onClick={onClear}
          >
            Unlink
          </Button>
        ) : null}
        {onPick ? (
          <Button
            type="button"
            size="xs"
            variant="outline"
            data-testid="change-replacement-btn"
            onClick={onPick}
          >
            Change
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      data-testid="pick-replacement-btn"
      className={className}
      onClick={onPick}
      disabled={!onPick}
    >
      {emptyLabel}
    </Button>
  );
}
