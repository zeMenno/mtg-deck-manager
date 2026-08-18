"use client";

import Link from "next/link";
import { use, useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { CardFaceTabs } from "@/components/cards/card-face-tabs";
import { CardImage } from "@/components/cards/card-image";
import { CardMetadata } from "@/components/cards/card-metadata";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { useCardDetail } from "@/lib/hooks/use-card-detail";

type CardDetailPageProps = {
  params: Promise<{ cardId: string }>;
};

export default function CardDetailPage({ params }: CardDetailPageProps) {
  const { cardId } = use(params);
  const { card, isLoading, isError, error } = useCardDetail(cardId);
  const [faceIndex, setFaceIndex] = useState(0);

  const faces = card?.faces ?? [];
  const activeFace = faces[faceIndex];

  if (isLoading && !card) {
    return (
      <p className="text-muted-foreground font-mono text-sm uppercase">
        Loading card…
      </p>
    );
  }

  if (isError || !card) {
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
          key={`${card.id}-${faceIndex}`}
          card={card}
          alt={activeFace?.name ?? card.name}
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

      <div>
        <h1 className="text-2xl font-black uppercase">{card.name}</h1>
        <CardMetadata card={card} face={activeFace} />
      </div>

      {card.scryfallUri ? (
        <Button variant="outline" asChild>
          <a
            href={card.scryfallUri}
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
