"use client";

import { cn } from "@/lib/utils";
import { useCardPrice } from "@/lib/hooks/use-card-price";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import {
  formatCurrency,
  formatPriceUnavailable,
  formatRelativeTime,
  isPriceStale,
  resolveDisplayState,
} from "@/lib/pricing/format-price";
import { DEFAULT_STALE_HOURS } from "@/lib/pricing/constants";
import type { Currency } from "@/types";

type CardPriceProps = {
  cardId: string;
  foil?: boolean;
  variant?: "inline" | "stacked";
  showSource?: boolean;
  showTimestamp?: boolean;
  currency?: Currency;
  className?: string;
  /** Override unit amount (e.g. line total). */
  amountOverride?: number;
  quantity?: number;
};

/**
 * Displays a card price with source, freshness, and unavailable fallback.
 * Never renders `$0.00` when the price is missing or fetch failed.
 */
export function CardPriceDisplay({
  cardId,
  foil = false,
  variant = "inline",
  showSource = true,
  showTimestamp = true,
  currency: currencyProp,
  className,
  amountOverride,
  quantity = 1,
}: CardPriceProps) {
  const online = useOnlineStatus();
  const { snapshot, unitPrice, isLoading, currency } = useCardPrice(cardId, {
    foil,
    currency: currencyProp,
  });

  const displayCurrency = currencyProp ?? currency;
  const state = resolveDisplayState(snapshot, isLoading);
  const stale =
    snapshot != null &&
    (Boolean(snapshot.isStale) ||
      isPriceStale(snapshot.fetchedAt, DEFAULT_STALE_HOURS));

  const amount =
    amountOverride ?? (unitPrice != null ? unitPrice * quantity : undefined);

  if (state === "loading") {
    return (
      <span
        data-testid={`card-price-loading-${cardId}`}
        className={cn(
          "bg-muted border-border inline-block h-4 w-16 animate-pulse border",
          className,
        )}
        aria-busy="true"
      />
    );
  }

  const lastKnownUnit =
    snapshot?.normal ?? snapshot?.market ?? snapshot?.low ?? snapshot?.foil;

  // Missing price for this foil/normal selection — never show $0.00
  if (amount == null) {
    const unavailableLabel =
      lastKnownUnit != null && snapshot
        ? formatPriceUnavailable({
            amount: lastKnownUnit,
            currency: snapshot.currency,
            fetchedAt: snapshot.fetchedAt,
          })
        : "Price unavailable";

    return (
      <span
        data-testid={`card-price-${cardId}`}
        data-price-state="unavailable"
        className={cn(
          "text-muted-foreground font-mono text-xs",
          variant === "stacked" && "flex flex-col gap-0.5",
          className,
        )}
      >
        {unavailableLabel}
        {!online ? (
          <span className="text-muted-foreground"> · Offline</span>
        ) : null}
      </span>
    );
  }

  const metaParts: string[] = [];
  if (state === "cached_fallback" || !online) {
    metaParts.push(online ? "Last known price" : "Offline · cached price");
  }
  if (showSource) {
    metaParts.push(snapshot?.source ?? "scryfall");
  }
  if (showTimestamp && snapshot?.fetchedAt) {
    metaParts.push(formatRelativeTime(snapshot.fetchedAt));
  }
  if (stale) {
    metaParts.push("(stale)");
  }

  return (
    <span
      data-testid={`card-price-${cardId}`}
      data-price-state={
        state === "cached_fallback" ? "cached_fallback" : "available"
      }
      className={cn(
        "font-mono text-xs",
        variant === "stacked" ? "flex flex-col gap-0.5" : "inline",
        className,
      )}
    >
      <span className="font-bold">
        {formatCurrency(amount, displayCurrency)}
      </span>
      {metaParts.length > 0 ? (
        <span className="text-muted-foreground">
          {variant === "inline" ? " · " : null}
          {metaParts.join(" · ")}
        </span>
      ) : null}
    </span>
  );
}
