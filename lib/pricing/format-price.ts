import type { Currency } from "@/types";
import type { CardPrice } from "@/types/card";
import type { CardPriceSnapshot, PriceDisplayState } from "@/lib/pricing/types";

/**
 * Parse Scryfall price strings. `null` / empty → `undefined` (unavailable).
 * `"0.00"` → `0` (valid zero).
 */
export function parsePrice(
  value: string | null | undefined,
): number | undefined {
  if (value == null) return undefined;
  const trimmed = String(value).trim();
  if (trimmed === "") return undefined;
  const n = Number.parseFloat(trimmed);
  if (Number.isNaN(n)) return undefined;
  return n;
}

export function formatCurrency(
  amount: number,
  currency: Currency = "USD",
): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Never coerce null/undefined/NaN to `$0.00`.
 */
export function formatPrice(
  amount: number | undefined | null,
  currency: Currency = "USD",
): string {
  if (amount == null || Number.isNaN(amount)) return "Price unavailable";
  return formatCurrency(amount, currency);
}

export function formatRelativeTime(
  isoDate: string,
  nowMs: number = Date.now(),
): string {
  const then = Date.parse(isoDate);
  if (Number.isNaN(then)) return "Unknown time";

  const diffMs = nowMs - then;
  if (diffMs < 0) return "Just now";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;

  return new Date(isoDate).toLocaleDateString();
}

export function formatPriceWithMeta(
  price: Pick<
    CardPriceSnapshot | CardPrice,
    "normal" | "market" | "low" | "source" | "fetchedAt"
  > & { currency?: Currency },
  options?: {
    amount?: number;
    currency?: Currency;
    showSource?: boolean;
    showTimestamp?: boolean;
    isStale?: boolean;
  },
): string {
  const currency = options?.currency ?? price.currency ?? "USD";
  const amount =
    options?.amount ?? price.normal ?? price.market ?? price.low ?? undefined;
  const base = formatPrice(amount, currency);
  if (base === "Price unavailable") return base;

  const parts = [base];
  if (options?.showSource !== false) {
    parts.push(price.source);
  }
  if (options?.showTimestamp !== false) {
    parts.push(formatRelativeTime(price.fetchedAt));
  }
  if (options?.isStale) {
    parts.push("(stale)");
  }
  return parts.join(" · ");
}

export function formatPriceUnavailable(
  lastKnown?: {
    amount: number;
    currency?: Currency;
    fetchedAt?: string;
  } | null,
): string {
  if (
    lastKnown == null ||
    lastKnown.amount == null ||
    Number.isNaN(lastKnown.amount)
  ) {
    return "Price unavailable";
  }
  const currency = lastKnown.currency ?? "USD";
  const amountLabel = formatCurrency(lastKnown.amount, currency);
  if (lastKnown.fetchedAt) {
    return `Price unavailable · Last known: ${amountLabel} · ${formatRelativeTime(lastKnown.fetchedAt)}`;
  }
  return `Price unavailable · Last known: ${amountLabel}`;
}

export function resolveDisplayState(
  snapshot: CardPriceSnapshot | null | undefined,
  isLoading: boolean,
): PriceDisplayState {
  if (isLoading) return "loading";
  if (!snapshot) return "unavailable";
  if (snapshot.isCachedFallback) return "cached_fallback";
  const hasPrice =
    snapshot.normal != null ||
    snapshot.foil != null ||
    snapshot.market != null ||
    snapshot.low != null;
  return hasPrice ? "available" : "unavailable";
}

export function isPriceStale(
  fetchedAt: string,
  staleAfterHours: number,
  nowMs: number = Date.now(),
): boolean {
  const then = Date.parse(fetchedAt);
  if (Number.isNaN(then)) return true;
  return nowMs - then > staleAfterHours * 60 * 60 * 1000;
}
