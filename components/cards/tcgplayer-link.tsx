"use client";

import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TcgplayerLinkProps = {
  tcgplayerUri?: string | null;
  cardName: string;
  className?: string;
  variant?: "button" | "link";
};

/**
 * Outbound TCGplayer purchase link. Never scrapes — uses stored URI from Scryfall.
 * Hidden when URI is absent.
 */
export function TcgplayerLink({
  tcgplayerUri,
  cardName,
  className,
  variant = "button",
}: TcgplayerLinkProps) {
  if (!tcgplayerUri) return null;

  const aria = `View ${cardName} on TCGplayer (opens in new tab)`;

  if (variant === "link") {
    return (
      <a
        href={tcgplayerUri}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={aria}
        data-testid="tcgplayer-link"
        className={cn(
          "text-foreground inline-flex min-h-11 items-center gap-1 text-sm font-bold underline",
          className,
        )}
      >
        TCGplayer
        <ExternalLink className="size-3.5" aria-hidden />
      </a>
    );
  }

  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className={cn("min-h-11", className)}
      data-testid="tcgplayer-link"
    >
      <a
        href={tcgplayerUri}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={aria}
      >
        TCGplayer
        <ExternalLink className="size-4" aria-hidden />
      </a>
    </Button>
  );
}
