"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  applyBulkCheapest,
  planBulkCheapest,
  type BulkCheapestPlanRow,
  type BulkCheapestProgress,
  type BulkCheapestScope,
} from "@/lib/deck/bulk-cheapest";
import { deckKeys } from "@/lib/deck/deck-queries";
import { getDatabase } from "@/lib/db/database";
import {
  PricingService,
  getPricingService,
} from "@/lib/pricing/pricing-service";
import type { Currency } from "@/types";

export function useBulkCheapest(deckId: string) {
  const queryClient = useQueryClient();
  const controller = useRef<AbortController | null>(null);
  const [progress, setProgress] = useState<BulkCheapestProgress>({
    completed: 0,
    total: 0,
  });
  const [preview, setPreview] = useState<BulkCheapestPlanRow[]>([]);
  const [currency, setCurrency] = useState<Currency>("USD");

  const plan = useMutation({
    mutationFn: async ({
      scope,
      includeOwned,
    }: {
      scope: BulkCheapestScope;
      includeOwned: boolean;
    }) => {
      controller.current = new AbortController();
      setPreview([]);
      setProgress({ completed: 0, total: 0 });
      const currency = await getPricingService().getCurrency();
      setCurrency(currency);
      const rows = await planBulkCheapest(
        {
          deckId,
          scope,
          includeOwned,
          currency,
          signal: controller.current.signal,
          onProgress: setProgress,
        },
        { database: getDatabase() },
      );
      return { rows, currency };
    },
    onSuccess: ({ rows }) => setPreview(rows),
  });

  const apply = useMutation({
    mutationFn: async () => {
      controller.current = new AbortController();
      setProgress({ completed: 0, total: preview.length });
      const currency = await getPricingService().getCurrency();
      const result = await applyBulkCheapest(preview, {
        database: getDatabase(),
        currency,
        signal: controller.current.signal,
        onProgress: setProgress,
      });
      await new PricingService({ database: getDatabase() }).getPricesForDeck(
        deckId,
        { currency, online: false },
      );
      return result;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: deckKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["prices"] });
    },
  });

  return {
    preview,
    currency,
    progress,
    plan,
    apply,
    cancel: () => controller.current?.abort(),
    clearPreview: () => setPreview([]),
  };
}
