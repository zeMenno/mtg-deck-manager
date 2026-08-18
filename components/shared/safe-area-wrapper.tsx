"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SafeAreaWrapperProps = {
  children: ReactNode;
  className?: string;
  /** Apply top safe-area padding (notch / status bar). */
  top?: boolean;
  /** Apply bottom safe-area padding (home indicator). */
  bottom?: boolean;
  /** Apply left/right safe-area (landscape). */
  x?: boolean;
};

/**
 * Optional wrapper for surfaces that need explicit safe-area insets.
 * Prefer utility classes (`pt-safe`, `pb-safe`, `px-safe`) when possible.
 */
export function SafeAreaWrapper({
  children,
  className,
  top,
  bottom,
  x,
}: SafeAreaWrapperProps) {
  return (
    <div
      data-testid="safe-area-wrapper"
      className={cn(
        top && "pt-safe",
        bottom && "pb-safe",
        x && "px-safe",
        className,
      )}
    >
      {children}
    </div>
  );
}
