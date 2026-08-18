"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { priceKeys } from "@/lib/hooks/use-card-price";
import { getPricingService } from "@/lib/pricing/pricing-service";
import type { RefreshResult } from "@/lib/pricing/types";

export function useRefreshPrices(deckId: string | undefined): {
  refresh: () => void;
  refreshAsync: () => Promise<RefreshResult | undefined>;
  isPending: boolean;
  progress: { current: number; total: number } | null;
  isOnline: boolean;
} {
  const queryClient = useQueryClient();
  const online = useOnlineStatus();

  const mutation = useMutation({
    mutationFn: async (): Promise<RefreshResult> => {
      if (!deckId) {
        return { refreshed: 0, failed: 0, skipped: 0 };
      }
      if (!online) {
        throw new Error("Offline — using cached prices only");
      }
      return getPricingService().refreshDeckPrices(deckId, { online: true });
    },
    onSuccess: async (result) => {
      if (!deckId) return;
      const currency = await getPricingService().getCurrency();
      await queryClient.invalidateQueries({
        queryKey: priceKeys.deck(deckId, currency),
      });
      await queryClient.invalidateQueries({
        queryKey: priceKeys.valuation(deckId, currency),
      });
      await queryClient.invalidateQueries({ queryKey: priceKeys.all });
      toast.success(
        `Updated ${result.refreshed} prices${
          result.failed > 0 ? `, ${result.failed} unavailable` : ""
        }`,
      );
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Could not refresh prices",
      );
    },
  });

  return {
    refresh: () => {
      void mutation.mutateAsync();
    },
    refreshAsync: () => mutation.mutateAsync(),
    isPending: mutation.isPending,
    progress: null,
    isOnline: online,
  };
}
