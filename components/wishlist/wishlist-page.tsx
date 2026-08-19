"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { CardDetailSheet } from "@/components/cards/card-detail-sheet";
import { EditWishlistItemSheet } from "@/components/wishlist/edit-wishlist-item-sheet";
import { MoveToDeckSheet } from "@/components/wishlist/move-to-deck-sheet";
import { WishlistEmptyState } from "@/components/wishlist/wishlist-empty-state";
import { WishlistFilters } from "@/components/wishlist/wishlist-filters";
import { WishlistItemRow } from "@/components/wishlist/wishlist-item-row";
import { WishlistSummaryBar } from "@/components/wishlist/wishlist-summary-bar";
import { PriorityPicker } from "@/components/wishlist/priority-picker";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useDatabase } from "@/components/providers/database-provider";
import { useDisplayPreferences } from "@/lib/hooks/use-display-preferences";
import { useDecks } from "@/lib/hooks/use-decks";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { useTags } from "@/lib/hooks/use-tags";
import {
  useBulkUpdateWishlistPriority,
  useRemoveWishlistItems,
  useRestoreWishlistItems,
  useWishlist,
  useWishlistSummary,
  wishlistKeys,
} from "@/lib/hooks/use-wishlist";
import { useUndoAction } from "@/lib/hooks/use-undo-action";
import { getWishlistService } from "@/lib/wishlist";
import { getPricingService } from "@/lib/pricing/pricing-service";
import { priceKeys } from "@/lib/hooks/use-card-price";
import { selectUnitPrice } from "@/lib/pricing/valuation";
import type {
  DeckCardStatus,
  WishlistPriority,
  WishlistSortKey,
} from "@/types";
import type { WishlistItemWithCard } from "@/lib/wishlist/types";
import type { Card } from "@/types/card";
import type { WishlistItem } from "@/types/wishlist";
import { PageTransition } from "@/components/shared/page-transition";
import { WishlistSkeleton } from "@/components/shared/skeletons";

export function WishlistPage() {
  const router = useRouter();
  const { ready } = useDatabase();
  const { decks } = useDecks();
  const { tags } = useTags();
  const { imagesEnabled, effectiveDensity } = useDisplayPreferences();
  const online = useOnlineStatus();
  const queryClient = useQueryClient();

  const [priority, setPriority] = useState<WishlistPriority | "all">("all");
  const [targetDeckFilter, setTargetDeckFilter] = useState<
    string | "all" | "none"
  >("all");
  const [sort, setSort] = useState<WishlistSortKey>("priority");
  const [search, setSearch] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [editItem, setEditItem] = useState<WishlistItemWithCard | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [moveItems, setMoveItems] = useState<WishlistItemWithCard[]>([]);
  const [moveStatus, setMoveStatus] =
    useState<Extract<DeckCardStatus, "consider" | "add">>("consider");
  const [moveOpen, setMoveOpen] = useState(false);
  const [detailCard, setDetailCard] = useState<Card | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [bulkPriorityOpen, setBulkPriorityOpen] = useState(false);
  const [bulkPriority, setBulkPriority] = useState<WishlistPriority>("medium");

  const listFilters = priority === "all" ? undefined : { priority };

  const { items: rawItems, isLoading } = useWishlist(listFilters);
  const { summary, refetch: refetchSummary } = useWishlistSummary();
  const removeItems = useRemoveWishlistItems();
  const restoreItems = useRestoreWishlistItems();
  const bulkPriorityMutation = useBulkUpdateWishlistPriority();
  const { showUndo } = useUndoAction();

  const currencyQuery = useQuery({
    queryKey: ["settings", "currency"],
    queryFn: () => getPricingService().getCurrency(),
    enabled: ready,
    staleTime: 60_000,
  });
  const currency = currencyQuery.data ?? "USD";

  const priceQuery = useQuery({
    queryKey: [...wishlistKeys.all, "prices", currency],
    queryFn: async () => {
      const ids = [...new Set(rawItems.map((i) => i.cardId))];
      const { CardPriceRepository } =
        await import("@/lib/db/repositories/card-price-repository");
      const priceMap = await new CardPriceRepository().getByCardIdsForCurrency(
        ids,
        currency,
      );
      const map = new Map<string, number | undefined>();
      for (const id of ids) {
        map.set(id, selectUnitPrice(priceMap.get(id), { foil: false }));
      }
      return map;
    },
    enabled: ready && rawItems.length > 0,
  });

  const service = getWishlistService();

  const items = useMemo(() => {
    let next = rawItems;
    if (targetDeckFilter === "none") {
      next = next.filter((i) => !i.targetDeckId);
    } else if (targetDeckFilter !== "all") {
      next = next.filter((i) => i.targetDeckId === targetDeckFilter);
    }
    if (search.trim()) {
      next = service.filterByName(next, search);
    }
    return service.sortItems(next, sort, priceQuery.data);
  }, [rawItems, targetDeckFilter, search, sort, priceQuery.data, service]);

  const deckNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const deck of decks) map.set(deck.id, deck.name);
    return map;
  }, [decks]);

  const tagById = useMemo(() => {
    const map = new Map(tags.map((t) => [t.id, t]));
    return map;
  }, [tags]);

  const refreshMutation = useMutation({
    mutationFn: async () => {
      if (!online) throw new Error("Offline — using cached prices only");
      const ids = [...new Set(rawItems.map((i) => i.cardId))];
      return getPricingService().refreshCardPrices(ids, {
        online: true,
        currency,
      });
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: priceKeys.all });
      await queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
      refetchSummary();
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

  const hasActiveFilters =
    priority !== "all" ||
    targetDeckFilter !== "all" ||
    search.trim().length > 0;

  function openMove(
    nextItems: WishlistItemWithCard[],
    status: Extract<DeckCardStatus, "consider" | "add">,
  ) {
    setMoveItems(nextItems);
    setMoveStatus(status);
    setMoveOpen(true);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedItems = items.filter((i) => selectedIds.has(i.id));

  return (
    <PageTransition transitionKey="wishlist">
      <div className="flex flex-col gap-4" data-testid="wishlist-page">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black uppercase">Wishlist</h1>
            <p className="text-muted-foreground font-mono text-xs uppercase">
              {summary?.totalItems ?? 0} items
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-testid="wishlist-select-toggle"
              onClick={() => {
                setSelectionMode((v) => !v);
                setSelectedIds(new Set());
              }}
            >
              {selectionMode ? "Cancel select" : "Select"}
            </Button>
          </div>
        </div>

        <WishlistSummaryBar
          summary={summary}
          isRefreshing={refreshMutation.isPending}
          canRefresh={online && rawItems.length > 0}
          onRefreshPrices={() => refreshMutation.mutate()}
        />

        <WishlistFilters
          priority={priority}
          onPriorityChange={setPriority}
          targetDeckId={targetDeckFilter}
          onTargetDeckChange={setTargetDeckFilter}
          sort={sort}
          onSortChange={setSort}
          search={search}
          onSearchChange={setSearch}
          decks={decks}
        />

        {isLoading ? (
          <WishlistSkeleton />
        ) : items.length === 0 ? (
          <WishlistEmptyState
            filtered={hasActiveFilters || rawItems.length > 0}
          />
        ) : (
          <ul className="flex flex-col gap-2" data-testid="wishlist-item-list">
            {items.map((item) => (
              <li key={item.id}>
                <WishlistItemRow
                  item={item}
                  density={effectiveDensity}
                  imagesEnabled={imagesEnabled}
                  selected={selectedIds.has(item.id)}
                  selectionMode={selectionMode}
                  deckName={
                    item.targetDeckId
                      ? deckNameById.get(item.targetDeckId)
                      : undefined
                  }
                  roleTag={
                    item.targetRole ? tagById.get(item.targetRole) : undefined
                  }
                  onPress={() => {
                    setEditItem(item);
                    setEditOpen(true);
                  }}
                  onToggleSelect={() => toggleSelect(item.id)}
                  onConsider={() => openMove([item], "consider")}
                  onAdd={() => openMove([item], "add")}
                />
              </li>
            ))}
          </ul>
        )}

        {selectionMode && selectedIds.size > 0 ? (
          <div
            data-testid="wishlist-bulk-bar"
            className="pb-safe border-border bg-background fixed inset-x-0 bottom-[var(--bottom-nav-height)] z-40 border-t px-4 py-3 shadow-md"
          >
            <div className="mx-auto flex max-w-3xl flex-col gap-2">
              <p className="font-mono text-xs uppercase">
                {selectedIds.size} selected
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  data-testid="wishlist-bulk-consider"
                  onClick={() => openMove(selectedItems, "consider")}
                >
                  CONSIDER
                </Button>
                <Button
                  type="button"
                  size="sm"
                  data-testid="wishlist-bulk-add"
                  onClick={() => openMove(selectedItems, "add")}
                >
                  ADD
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid="wishlist-bulk-priority"
                  onClick={() => setBulkPriorityOpen(true)}
                >
                  Priority
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  data-testid="wishlist-bulk-remove"
                  onClick={() => {
                    const ids = [...selectedIds];
                    const snapshots: WishlistItem[] = selectedItems.map(
                      (item) => ({
                        id: item.id,
                        wishlistId: item.wishlistId,
                        cardId: item.cardId,
                        quantity: item.quantity,
                        priority: item.priority,
                        targetDeckId: item.targetDeckId,
                        targetRole: item.targetRole,
                        notes: item.notes,
                        addedAt: item.addedAt,
                        updatedAt: item.updatedAt,
                      }),
                    );
                    void removeItems.mutateAsync(ids).then(() => {
                      setSelectedIds(new Set());
                      setSelectionMode(false);
                      showUndo({
                        message: `Removed ${snapshots.length} from wishlist`,
                        undo: async () => {
                          await restoreItems.mutateAsync(snapshots);
                        },
                      });
                    });
                  }}
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <EditWishlistItemSheet
          item={editItem}
          open={editOpen}
          onOpenChange={setEditOpen}
          onViewCard={() => {
            if (!editItem?.card) return;
            setDetailCard(editItem.card);
            setDetailOpen(true);
          }}
          onMoveConsider={() => {
            if (!editItem) return;
            setEditOpen(false);
            openMove([editItem], "consider");
          }}
          onMoveAdd={() => {
            if (!editItem) return;
            setEditOpen(false);
            openMove([editItem], "add");
          }}
        />

        <MoveToDeckSheet
          items={moveItems}
          open={moveOpen}
          onOpenChange={setMoveOpen}
          status={moveStatus}
          onSuccess={(deckId) => {
            setSelectionMode(false);
            setSelectedIds(new Set());
            if (moveStatus === "add") {
              router.push(`/decks/${deckId}/changes/add`);
            } else {
              router.push(`/decks/${deckId}/changes/consider`);
            }
          }}
        />

        <CardDetailSheet
          card={detailCard}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />

        <Sheet open={bulkPriorityOpen} onOpenChange={setBulkPriorityOpen}>
          <SheetContent
            side="bottom"
            snap="half"
            data-testid="wishlist-bulk-priority-sheet"
          >
            <SheetHeader>
              <SheetTitle>Set priority</SheetTitle>
            </SheetHeader>
            <div className="px-4">
              <PriorityPicker value={bulkPriority} onChange={setBulkPriority} />
            </div>
            <SheetFooter>
              <Button
                type="button"
                data-testid="wishlist-bulk-priority-save"
                disabled={bulkPriorityMutation.isPending}
                onClick={() => {
                  void bulkPriorityMutation
                    .mutateAsync({
                      ids: [...selectedIds],
                      priority: bulkPriority,
                    })
                    .then(() => {
                      setBulkPriorityOpen(false);
                      toast.success("Priority updated");
                    });
                }}
              >
                Apply
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </PageTransition>
  );
}
