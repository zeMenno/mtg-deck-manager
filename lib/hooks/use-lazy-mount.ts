"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

type UseLazyMountOptions = {
  /** Expand root intersection box so images mount slightly early. */
  rootMargin?: string;
  /** Once mounted, stay mounted. Default true. */
  once?: boolean;
  /** When false, mount immediately (e.g. priority / commander). */
  enabled?: boolean;
};

/**
 * Mount children only when the sentinel enters (or nears) the viewport.
 */
export function useLazyMount({
  rootMargin = "200px",
  once = true,
  enabled = true,
}: UseLazyMountOptions = {}): {
  ref: RefObject<HTMLDivElement | null>;
  mounted: boolean;
} {
  const ref = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setMounted(true);
      return;
    }

    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setMounted(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        setMounted(true);
        if (once) observer.disconnect();
      },
      { rootMargin, threshold: 0.01 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, once, rootMargin]);

  return { ref, mounted };
}
