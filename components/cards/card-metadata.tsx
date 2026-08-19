"use client";

import { ColorIdentityPips } from "@/components/cards/color-identity-pips";
import { ManaCost } from "@/components/cards/mana-cost";
import { Badge } from "@/components/ui/badge";
import type { Card, CardFace } from "@/types/card";

type CardMetadataProps = {
  card: Card;
  face?: CardFace;
};

export function CardMetadata({ card, face }: CardMetadataProps) {
  const name = face?.name ?? card.name;
  const manaCost = face?.manaCost ?? card.manaCost;
  const typeLine = face?.typeLine ?? card.typeLine;
  const oracleText = face?.oracleText ?? card.oracleText;

  return (
    <div className="flex flex-col gap-3" data-testid="card-metadata">
      <div>
        <h2 className="font-heading text-xl font-black uppercase">{name}</h2>
        {manaCost ? (
          <ManaCost cost={manaCost} size="md" className="mt-1" />
        ) : null}
      </div>

      <p className="text-sm font-bold">{typeLine}</p>

      {oracleText ? (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {oracleText}
        </p>
      ) : null}

      <ColorIdentityPips colors={card.colors} label="Colors" />
      <ColorIdentityPips
        colors={card.colorIdentity}
        label="Color identity"
        testId="color-identity-pips"
      />

      <dl className="grid grid-cols-2 gap-2 text-xs">
        {card.setName || card.setCode ? (
          <>
            <dt className="text-muted-foreground uppercase">Set</dt>
            <dd className="font-mono">
              {card.setName ?? card.setCode}
              {card.setCode ? ` (${card.setCode.toUpperCase()})` : null}
            </dd>
          </>
        ) : null}
        {card.rarity ? (
          <>
            <dt className="text-muted-foreground uppercase">Rarity</dt>
            <dd className="capitalize">{card.rarity}</dd>
          </>
        ) : null}
        {card.collectorNumber ? (
          <>
            <dt className="text-muted-foreground uppercase">Collector #</dt>
            <dd className="font-mono">{card.collectorNumber}</dd>
          </>
        ) : null}
        <dt className="text-muted-foreground uppercase">Mana value</dt>
        <dd>
          <Badge variant="secondary">{card.manaValue}</Badge>
        </dd>
        {card.layout && card.layout !== "normal" ? (
          <>
            <dt className="text-muted-foreground uppercase">Layout</dt>
            <dd className="font-mono">{card.layout}</dd>
          </>
        ) : null}
      </dl>
    </div>
  );
}
