"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { CardFaceTabs } from "@/components/cards/card-face-tabs";
import { CardImage } from "@/components/cards/card-image";
import { CardLegalityPanel } from "@/components/cards/card-legality-panel";
import { CardMetadata } from "@/components/cards/card-metadata";
import { CardPriceDisplay } from "@/components/cards/card-price";
import { TcgplayerLink } from "@/components/cards/tcgplayer-link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { CardRepository } from "@/lib/db/repositories";
import { useCardDetail } from "@/lib/hooks/use-card-detail";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { getCardById, normalizeScryfallCard } from "@/lib/scryfall";
import type { Card } from "@/types/card";

type CardDetailPageProps = {
  params: Promise<{ cardId: string }>;
};

export default function CardDetailPage({ params }: CardDetailPageProps) {
  const { cardId } = use(params);
  const { card, isLoading, isError, error } = useCardDetail(cardId);
  const [faceIndex, setFaceIndex] = useState(0);
  const [tab, setTab] = useState("overview");
  const [displayCard, setDisplayCard] = useState<Card | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const online = useOnlineStatus();

  useEffect(() => {
    setFaceIndex(0);
    setTab("overview");
  }, [cardId]);

  useEffect(() => {
    setDisplayCard(card ?? null);
  }, [card]);

  const active = displayCard ?? card;
  const faces = active?.faces ?? [];
  const activeFace = faces[faceIndex];

  async function refreshLegality() {
    if (!active || !online) return;
    setRefreshing(true);
    try {
      const raw = await getCardById(active.id);
      const normalized = normalizeScryfallCard(raw);
      await new CardRepository().upsert(normalized);
      setDisplayCard(normalized);
      toast.success("Card refreshed");
    } catch {
      toast.error("Could not refresh card");
    } finally {
      setRefreshing(false);
    }
  }

  if (isLoading && !active) {
    return (
      <p className="text-muted-foreground font-mono text-sm uppercase">
        Loading card…
      </p>
    );
  }

  if (isError || !active) {
    return (
      <div className="flex flex-col gap-4">
        <Button variant="outline" asChild className="w-fit">
          <Link href="/cards">
            <ArrowLeft className="size-4" />
            Back to search
          </Link>
        </Button>
        <EmptyState
          title="Card not found"
          description={error?.message ?? "This card is not in the local cache."}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <Button variant="outline" asChild className="w-fit">
        <Link href="/cards">
          <ArrowLeft className="size-4" />
          Back to search
        </Link>
      </Button>

      <div className="flex justify-center">
        <CardImage
          key={`${active.id}-${faceIndex}`}
          card={active}
          alt={activeFace?.name ?? active.name}
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

      <h1 className="text-2xl font-black uppercase">{active.name}</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview" data-testid="card-detail-tab-overview">
            Overview
          </TabsTrigger>
          <TabsTrigger value="legality" data-testid="card-detail-tab-legality">
            Legality
          </TabsTrigger>
          <TabsTrigger value="price" data-testid="card-detail-tab-price">
            Price
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <CardMetadata card={active} face={activeFace} />
        </TabsContent>
        <TabsContent value="legality">
          <CardLegalityPanel
            card={active}
            onRefresh={() => void refreshLegality()}
            refreshing={refreshing}
          />
        </TabsContent>
        <TabsContent value="price">
          <div
            className="border-border flex flex-col gap-2 border p-3"
            data-testid="card-detail-price"
          >
            <CardPriceDisplay
              cardId={active.id}
              variant="stacked"
              showSource
              showTimestamp
            />
            <TcgplayerLink
              tcgplayerUri={active.tcgplayerUri}
              cardName={active.name}
            />
          </div>
        </TabsContent>
      </Tabs>

      {active.scryfallUri ? (
        <Button variant="outline" asChild>
          <a
            href={active.scryfallUri}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="scryfall-link"
          >
            View on Scryfall
            <ExternalLink className="size-4" />
          </a>
        </Button>
      ) : null}
    </div>
  );
}
