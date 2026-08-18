"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useDatabase } from "@/components/providers/database-provider";
import {
  getWishlistService,
  wishlistKeys,
  type AddToWishlistOptions,
  type WishlistSummary,
} from "@/lib/wishlist";
import type { WishlistPriority } from "@/types";
import type { WishlistItemFilters, WishlistSortKey } from "@/types/wishlist";
import type { WishlistItemWithCard } from "@/lib/wishlist/types";

export { wishlistKeys };

export function useWishlist(filters?: WishlistItemFilters): {
  items: WishlistItemWithCard[];
  isLoading: boolean;
  refetch: () => void;
} {
  const { ready } = useDatabase();
  const query = useQuery({
    queryKey: wishlistKeys.list(filters as Record<string, unknown> | undefined),
    queryFn: () => getWishlistService().listItemsWithCards(filters),
    enabled: ready,
  });

  return {
    items: query.data ?? [],
    isLoading: !ready || query.isLoading,
    refetch: () => {
      void query.refetch();
    },
  };
}

export function useWishlistSummary(): {
  summary: WishlistSummary | undefined;
  isLoading: boolean;
  refetch: () => void;
} {
  const { ready } = useDatabase();
  const query = useQuery({
    queryKey: wishlistKeys.summary(),
    queryFn: () => getWishlistService().getSummary(),
    enabled: ready,
  });

  return {
    summary: query.data,
    isLoading: !ready || query.isLoading,
    refetch: () => {
      void query.refetch();
    },
  };
}

export function useWishlistByCard(cardId: string | undefined): {
  items: Awaited<
    ReturnType<ReturnType<typeof getWishlistService>["findByCardId"]>
  >;
  isLoading: boolean;
} {
  const { ready } = useDatabase();
  const query = useQuery({
    queryKey: wishlistKeys.byCard(cardId ?? ""),
    queryFn: () => getWishlistService().findByCardId(cardId!),
    enabled: ready && Boolean(cardId),
  });

  return {
    items: query.data ?? [],
    isLoading: !ready || query.isLoading,
  };
}

function invalidateWishlist(
  queryClient: ReturnType<typeof useQueryClient>,
  cardId?: string,
) {
  void queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
  if (cardId) {
    void queryClient.invalidateQueries({
      queryKey: wishlistKeys.byCard(cardId),
    });
  }
}

export function useAddToWishlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      cardId,
      options,
    }: {
      cardId: string;
      options?: AddToWishlistOptions;
    }) => getWishlistService().addCardToWishlist(cardId, options),
    onSuccess: (result) => {
      invalidateWishlist(queryClient, result.item.cardId);
    },
  });
}

export function useUpdateWishlistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      patch,
    }: {
      itemId: string;
      patch: {
        quantity?: number;
        priority?: WishlistPriority;
        targetDeckId?: string | null;
        targetRole?: string | null;
        notes?: string | null;
      };
    }) => getWishlistService().updateItem(itemId, patch),
    onSuccess: (item) => {
      invalidateWishlist(queryClient, item.cardId);
    },
  });
}

export function useRemoveFromWishlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      getWishlistService().removeFromWishlist(itemId),
    onSuccess: () => {
      invalidateWishlist(queryClient);
    },
  });
}

export function useRemoveWishlistItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => getWishlistService().removeItems(ids),
    onSuccess: () => {
      invalidateWishlist(queryClient);
    },
  });
}

export function useBulkUpdateWishlistPriority() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ids,
      priority,
    }: {
      ids: string[];
      priority: WishlistPriority;
    }) => {
      const service = getWishlistService();
      for (const id of ids) {
        await service.updatePriority(id, priority);
      }
    },
    onSuccess: () => {
      invalidateWishlist(queryClient);
    },
  });
}

export type UseWishlistViewOptions = {
  priority?: WishlistPriority | "all";
  targetDeckId?: string | null | "all";
  sort?: WishlistSortKey;
  search?: string;
};

export function useWishlistView(options: UseWishlistViewOptions = {}): {
  items: WishlistItemWithCard[];
  isLoading: boolean;
  refetch: () => void;
} {
  const filters: WishlistItemFilters | undefined =
    options.priority && options.priority !== "all"
      ? { priority: options.priority }
      : undefined;

  const { items, isLoading, refetch } = useWishlist(filters);
  const service = getWishlistService();

  let next = items;
  if (options.targetDeckId && options.targetDeckId !== "all") {
    if (options.targetDeckId === null) {
      next = next.filter((i) => !i.targetDeckId);
    } else {
      next = next.filter((i) => i.targetDeckId === options.targetDeckId);
    }
  }
  if (options.search) {
    next = service.filterByName(next, options.search);
  }
  next = service.sortItems(next, options.sort ?? "priority");

  return { items: next, isLoading, refetch };
}
