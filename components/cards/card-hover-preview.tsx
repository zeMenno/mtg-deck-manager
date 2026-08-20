"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { CardImage } from "@/components/cards/card-image";
import { cn } from "@/lib/utils";
import type { Card } from "@/types/card";

type CardHoverPreviewProps = {
  card: Card;
  anchor: DOMRect | null;
  imagesEnabled?: boolean;
};

const PREVIEW_WIDTH = 320;

/**
 * Decorative fine-pointer preview. Never the only way to read a card.
 */
export function CardHoverPreview({
  card,
  anchor,
  imagesEnabled = true,
}: CardHoverPreviewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (
    !mounted ||
    !anchor ||
    !imagesEnabled ||
    typeof document === "undefined"
  ) {
    return null;
  }

  const left = Math.min(
    Math.max(8, anchor.right + 12),
    window.innerWidth - PREVIEW_WIDTH - 8,
  );
  const top = Math.min(
    Math.max(8, anchor.top),
    window.innerHeight - 8 - PREVIEW_WIDTH * (680 / 488),
  );

  return createPortal(
    <div
      aria-hidden="true"
      data-testid="card-hover-preview"
      className="pointer-events-none fixed z-[60]"
      style={{ left, top, width: PREVIEW_WIDTH }}
    >
      <CardImage
        card={card}
        size="lg"
        priority
        imagesEnabled={imagesEnabled}
        className={cn("shadow-lg")}
      />
    </div>,
    document.body,
  );
}
