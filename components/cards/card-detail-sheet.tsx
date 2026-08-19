"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { CardFaceTabs } from "@/components/cards/card-face-tabs";
import { CardImage } from "@/components/cards/card-image";
import { CardLegalityPanel } from "@/components/cards/card-legality-panel";
import { CardMetadata } from "@/components/cards/card-metadata";
import { CardPriceDisplay } from "@/components/cards/card-price";
import { IllegalCardDialog } from "@/components/cards/illegal-card-dialog";
import { TcgplayerLink } from "@/components/cards/tcgplayer-link";
import { AddToWishlistSheet } from "@/components/wishlist/add-to-wishlist-sheet";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getLegalityCalloutText,
  getLegalityWarning,
  type LegalityWarning,
} from "@/lib/cards/legality";
import { useDecks } from "@/lib/hooks/use-decks";
import { useAddCard, useRemoveCard } from "@/lib/hooks/use-deck-mutations";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { useUndoAction } from "@/lib/hooks/use-undo-action";
import { getPricingService } from "@/lib/pricing/pricing-service";
import { priceKeys } from "@/lib/hooks/use-card-price";
import { CardRepository } from "@/lib/db/repositories";
import { getCardById, normalizeScryfallCard } from "@/lib/scryfall";
import { useDeckUiStore } from "@/store/deck-ui-store";
import type { DeckCardStatus, DeckCardZone } from "@/types";
import type { Card } from "@/types/card";

type CardDetailSheetProps = {
  card: Card | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * @deprecated Detail always shows large art when available (Phase 9).
   * Kept for call-site compatibility; ignored.
   */
  imagesEnabled?: boolean;
  /** Prefill target deck (e.g. when opened from a deck context). */
  deckId?: string;
};

export function CardDetailSheet({
  card,
  open,
  onOpenChange,
  deckId: deckIdProp,
}: CardDetailSheetProps) {
  const [faceIndex, setFaceIndex] = useState(0);
  const [tab, setTab] = useState("overview");
  const { decks } = useDecks();
  const activeDeckIdForSearch = useDeckUiStore((s) => s.activeDeckIdForSearch);
  const [targetDeckId, setTargetDeckId] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [zone, setZone] = useState<DeckCardZone>("mainboard");
  const [status, setStatus] = useState<DeckCardStatus>("current");
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [illegalOpen, setIllegalOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<DeckCardStatus>("current");
  const [pendingWarning, setPendingWarning] = useState<LegalityWarning | null>(
    null,
  );
  const [displayCard, setDisplayCard] = useState<Card | null>(card);
  const [refreshingLegality, setRefreshingLegality] = useState(false);
  const addCard = useAddCard();
  const removeCard = useRemoveCard();
  const online = useOnlineStatus();
  const { showUndo } = useUndoAction();
  const queryClient = useQueryClient();
  const [refreshingPrice, setRefreshingPrice] = useState(false);

  useEffect(() => {
    setFaceIndex(0);
    setTab("overview");
    setDisplayCard(card);
  }, [card]);

  useEffect(() => {
    const preferred = deckIdProp ?? activeDeckIdForSearch ?? decks[0]?.id ?? "";
    setTargetDeckId(preferred);
  }, [deckIdProp, activeDeckIdForSearch, decks]);

  const targetDeck = useMemo(
    () => decks.find((d) => d.id === targetDeckId),
    [decks, targetDeckId],
  );

  const activeCard = displayCard ?? card;
  const faces = activeCard?.faces ?? [];
  const activeFace = faces[faceIndex];

  const legalityCallout =
    activeCard && targetDeck
      ? getLegalityCalloutText(activeCard, targetDeck.format)
      : null;

  async function commitAdd(
    initialStatus: DeckCardStatus,
    illegalOverride: boolean,
  ) {
    if (!activeCard || !targetDeckId) {
      toast.error("Select a deck first");
      return;
    }
    try {
      const result = await addCard.mutateAsync({
        deckId: targetDeckId,
        cardId: activeCard.id,
        quantity,
        zone,
        status: initialStatus,
      });
      if (result.warnings.length > 0) {
        toast.warning(result.warnings[0]!.message);
      } else if (illegalOverride) {
        toast.warning(`Added ${activeCard.name} (format warning)`);
      }
      const deckCardId = result.deckCard.id;
      showUndo({
        message: `Added ${activeCard.name}`,
        undo: async () => {
          await removeCard.mutateAsync(deckCardId);
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add card");
    }
  }

  async function handleAdd(initialStatus: DeckCardStatus = status) {
    if (!activeCard || !targetDeckId) {
      toast.error("Select a deck first");
      return;
    }
    const format = targetDeck?.format ?? "other";
    const warning = getLegalityWarning(activeCard, format);
    if (warning) {
      setPendingStatus(initialStatus);
      setPendingWarning(warning);
      setIllegalOpen(true);
      return;
    }
    await commitAdd(initialStatus, false);
  }

  async function refreshLegality() {
    if (!activeCard || !online) return;
    setRefreshingLegality(true);
    try {
      const raw = await getCardById(activeCard.id);
      const normalized = normalizeScryfallCard(raw);
      await new CardRepository().upsert(normalized);
      setDisplayCard(normalized);
      toast.success("Card refreshed");
    } catch {
      toast.error("Could not refresh card");
    } finally {
      setRefreshingLegality(false);
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          snap="detail"
          className="overflow-y-auto"
          data-testid="card-detail-sheet"
        >
          {activeCard ? (
            <>
              <SheetHeader>
                <SheetTitle>{activeCard.name}</SheetTitle>
                <SheetDescription className="sr-only">
                  Card details for {activeCard.name}
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-col gap-4 px-4 pb-2">
                <div className="flex justify-center">
                  <CardImage
                    key={`${activeCard.id}-${faceIndex}`}
                    card={activeCard}
                    alt={activeFace?.name ?? activeCard.name}
                    size="lg"
                    faceIndex={faceIndex}
                    priority
                    imagesEnabled
                  />
                </div>

                <CardFaceTabs
                  faces={faces}
                  activeIndex={faceIndex}
                  onChange={setFaceIndex}
                />

                <Tabs value={tab} onValueChange={setTab}>
                  <TabsList>
                    <TabsTrigger
                      value="overview"
                      data-testid="card-detail-tab-overview"
                    >
                      Overview
                    </TabsTrigger>
                    <TabsTrigger
                      value="legality"
                      data-testid="card-detail-tab-legality"
                    >
                      Legality
                    </TabsTrigger>
                    <TabsTrigger
                      value="price"
                      data-testid="card-detail-tab-price"
                    >
                      Price
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="flex flex-col gap-4">
                    <CardMetadata card={activeCard} face={activeFace} />
                  </TabsContent>

                  <TabsContent value="legality">
                    <CardLegalityPanel
                      card={activeCard}
                      highlightFormat={targetDeck?.format}
                      onRefresh={() => void refreshLegality()}
                      refreshing={refreshingLegality}
                    />
                  </TabsContent>

                  <TabsContent value="price">
                    <div
                      className="border-border flex flex-col gap-2 border-2 p-3"
                      data-testid="card-detail-price"
                    >
                      <h3 className="font-mono text-xs uppercase">Price</h3>
                      <CardPriceDisplay
                        cardId={activeCard.id}
                        variant="stacked"
                        showSource
                        showTimestamp
                      />
                      <div className="flex flex-wrap gap-2">
                        <TcgplayerLink
                          tcgplayerUri={activeCard.tcgplayerUri}
                          cardName={activeCard.name}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          data-testid="refresh-card-price-btn"
                          disabled={!online || refreshingPrice}
                          title={
                            !online
                              ? "Offline — refresh unavailable"
                              : undefined
                          }
                          onClick={() => {
                            setRefreshingPrice(true);
                            void (async () => {
                              try {
                                const service = getPricingService();
                                const currency = await service.getCurrency();
                                await service.getPrice(activeCard.id, {
                                  refresh: true,
                                  online,
                                  currency,
                                });
                                await queryClient.invalidateQueries({
                                  queryKey: priceKeys.card(
                                    activeCard.id,
                                    currency,
                                  ),
                                });
                                toast.success("Price refreshed");
                              } catch {
                                toast.error("Could not refresh price");
                              } finally {
                                setRefreshingPrice(false);
                              }
                            })();
                          }}
                        >
                          {refreshingPrice ? "Refreshing…" : "Refresh price"}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="border-border flex flex-col gap-3 border-t-2 pt-4">
                  <h3 className="font-mono text-xs uppercase">Add to deck</h3>
                  {legalityCallout ? (
                    <p
                      className="border-border bg-warning/20 border-2 px-3 py-2 text-sm font-bold"
                      data-testid="legality-add-callout"
                      role="status"
                    >
                      {legalityCallout}
                    </p>
                  ) : null}
                  <label className="flex flex-col gap-1">
                    <span className="font-mono text-[0.625rem] uppercase">
                      Deck
                    </span>
                    <select
                      data-testid="add-to-deck-select"
                      value={targetDeckId}
                      onChange={(e) => setTargetDeckId(e.target.value)}
                      className="border-border bg-background h-11 border-2 px-3 font-bold"
                    >
                      <option value="">Select deck…</option>
                      {decks.map((deck) => (
                        <option key={deck.id} value={deck.id}>
                          {deck.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="grid grid-cols-3 gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="font-mono text-[0.625rem] uppercase">
                        Qty
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        data-testid="add-to-deck-qty"
                        value={quantity}
                        onChange={(e) =>
                          setQuantity(Math.max(1, Number(e.target.value) || 1))
                        }
                        className="border-border bg-background h-11 border-2 px-2"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="font-mono text-[0.625rem] uppercase">
                        Zone
                      </span>
                      <select
                        data-testid="add-to-deck-zone"
                        value={zone}
                        onChange={(e) =>
                          setZone(e.target.value as DeckCardZone)
                        }
                        className="border-border bg-background h-11 border-2 px-2 font-bold uppercase"
                      >
                        <option value="mainboard">Main</option>
                        <option value="sideboard">Side</option>
                        <option value="maybeboard">Maybe</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="font-mono text-[0.625rem] uppercase">
                        Status
                      </span>
                      <select
                        data-testid="add-to-deck-status"
                        value={status}
                        onChange={(e) =>
                          setStatus(e.target.value as DeckCardStatus)
                        }
                        className="border-border bg-background h-11 border-2 px-2 font-bold uppercase"
                      >
                        <option value="current">Current</option>
                        <option value="add">Add</option>
                        <option value="consider">Consider</option>
                        <option value="cut">Cut</option>
                      </select>
                    </label>
                  </div>
                </div>
              </div>

              <SheetFooter>
                {activeCard.scryfallUri ? (
                  <Button variant="outline" asChild>
                    <a
                      href={activeCard.scryfallUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="scryfall-link"
                    >
                      View on Scryfall
                      <ExternalLink className="size-4" />
                    </a>
                  </Button>
                ) : null}

                <Button
                  type="button"
                  data-testid="add-to-deck-btn"
                  disabled={!targetDeckId || addCard.isPending}
                  onClick={() => void handleAdd()}
                >
                  Add to Deck
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  data-testid="mark-consider-btn"
                  disabled={!targetDeckId || addCard.isPending}
                  onClick={() => void handleAdd("consider")}
                >
                  Mark as Consider
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  data-testid="add-to-wishlist-btn"
                  onClick={() => setWishlistOpen(true)}
                >
                  Add to Wishlist
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <IllegalCardDialog
        open={illegalOpen}
        onOpenChange={setIllegalOpen}
        warning={pendingWarning}
        pending={addCard.isPending}
        onConfirm={async () => {
          await commitAdd(pendingStatus, true);
        }}
      />

      <AddToWishlistSheet
        card={activeCard}
        open={wishlistOpen}
        onOpenChange={setWishlistOpen}
        defaultDeckId={targetDeckId || deckIdProp}
      />
    </>
  );
}
