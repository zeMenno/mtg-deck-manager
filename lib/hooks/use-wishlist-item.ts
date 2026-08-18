"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useDatabase } from "@/components/providers/database-provider";
import { deckKeys } from "@/lib/deck/deck-queries";
import {
  getWishlistPromotionService,
  getWishlistService,
  WishlistPromotionConflictError,
  wishlistKeys,
  type PromotionOptions,
  type PromotionResult,
} from "@/lib/wishlist";
import type { DeckCardStatus } from "@/types";

export function useWishlistItem(itemId: string | undefined): {
  item: Awaited<ReturnType<ReturnType<typeof getWishlistService>["getItem"]>>;
  isLoading: boolean;
} {
  const { ready } = useDatabase();
  const query = useQuery({
    queryKey: wishlistKeys.item(itemId ?? ""),
    queryFn: () => getWishlistService().getItem(itemId!),
    enabled: ready && Boolean(itemId),
  });

  return {
    item: query.data,
    isLoading: !ready || query.isLoading,
  };
}

function invalidateAfterPromotion(
  queryClient: ReturnType<typeof useQueryClient>,
  deckId: string,
) {
  void queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
  void queryClient.invalidateQueries({ queryKey: deckKeys.all });
  void queryClient.invalidateQueries({ queryKey: deckKeys.detail(deckId) });
  void queryClient.invalidateQueries({ queryKey: deckKeys.cards(deckId) });
}

export function usePromoteWishlistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      deckId,
      status,
      options,
    }: {
      itemId: string;
      deckId: string;
      status: Extract<DeckCardStatus, "consider" | "add">;
      options?: PromotionOptions;
    }): Promise<PromotionResult> => {
      const service = getWishlistPromotionService();
      if (status === "consider") {
        return service.promoteToConsider(itemId, deckId, options);
      }
      return service.promoteToAdd(itemId, deckId, options);
    },
    onSuccess: (result, vars) => {
      invalidateAfterPromotion(queryClient, vars.deckId);
      const label = result.status === "consider" ? "CONSIDER" : "ADD";
      toast.success(`Added to deck as ${label}`);
    },
    onError: (err) => {
      if (err instanceof WishlistPromotionConflictError) {
        toast.error(
          "Card is already in this deck as CURRENT. Confirm to add as upgrade anyway.",
        );
        return;
      }
      toast.error(
        err instanceof Error ? err.message : "Could not move wishlist item",
      );
    },
  });
}

export function usePromoteWishlistItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemIds,
      deckId,
      status,
      options,
    }: {
      itemIds: string[];
      deckId: string;
      status: Extract<DeckCardStatus, "consider" | "add">;
      options?: PromotionOptions;
    }) => {
      return getWishlistPromotionService().promoteMany(
        itemIds,
        deckId,
        status,
        options,
      );
    },
    onSuccess: (_result, vars) => {
      invalidateAfterPromotion(queryClient, vars.deckId);
      toast.success(`Moved ${vars.itemIds.length} item(s) to deck`);
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Could not move wishlist items",
      );
    },
  });
}
