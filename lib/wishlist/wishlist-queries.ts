/** React Query keys for wishlist. */
export const wishlistKeys = {
  all: ["wishlist"] as const,
  list: (filters?: Record<string, unknown>) =>
    [...wishlistKeys.all, "list", filters ?? {}] as const,
  item: (id: string) => [...wishlistKeys.all, "item", id] as const,
  summary: () => [...wishlistKeys.all, "summary"] as const,
  byCard: (cardId: string) => [...wishlistKeys.all, "byCard", cardId] as const,
};
