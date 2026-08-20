"use client";

import { useCallback, useState } from "react";

import type { Card } from "@/types/card";

export type CardZoomTarget = {
  card: Card;
  deckCardId?: string;
};

export function useCardZoom() {
  const [target, setTarget] = useState<CardZoomTarget | null>(null);

  const openZoom = useCallback((card: Card, deckCardId?: string) => {
    setTarget({ card, deckCardId });
  }, []);

  const closeZoom = useCallback(() => {
    setTarget(null);
  }, []);

  return {
    open: target != null,
    card: target?.card ?? null,
    deckCardId: target?.deckCardId,
    openZoom,
    closeZoom,
    setOpen: (next: boolean) => {
      if (!next) closeZoom();
    },
  };
}
