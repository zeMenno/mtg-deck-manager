"use client";

import type { CSSProperties, ReactNode } from "react";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { MOTION } from "@/lib/ui/motion-config";
import { cn } from "@/lib/utils";

type PageTransitionProps = {
  children: ReactNode;
  className?: string;
  /** Optional key to remount / re-trigger enter animation on route change. */
  transitionKey?: string;
};

/**
 * Lightweight fade/slide enter for major views.
 * Instant when prefers-reduced-motion is set.
 */
export function PageTransition({
  children,
  className,
  transitionKey,
}: PageTransitionProps) {
  const reduced = useReducedMotion();

  const style: CSSProperties | undefined = reduced
    ? undefined
    : {
        animation: `page-enter ${MOTION.pageMs}ms ${MOTION.easeOut} both`,
      };

  return (
    <div
      key={transitionKey}
      data-testid="page-transition"
      className={cn(className)}
      style={style}
    >
      {children}
    </div>
  );
}
