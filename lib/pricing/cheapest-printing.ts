import type { ScryfallCard } from "@/lib/scryfall/types";
import type { Currency } from "@/types";

export function getPrintingPrice(
  printing: Pick<ScryfallCard, "prices">,
  foil: boolean,
  currency: Currency,
): number | null {
  const prices = printing.prices;
  if (!prices) return null;
  const raw =
    currency === "EUR"
      ? foil
        ? (prices.eur_foil ?? prices.eur_etched)
        : prices.eur
      : foil
        ? (prices.usd_foil ?? prices.usd_etched)
        : prices.usd;
  if (raw == null || raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function tieBreak(
  a: ScryfallCard,
  b: ScryfallCard,
  currentId?: string,
): number {
  if (currentId) {
    if (a.id === currentId && b.id !== currentId) return -1;
    if (b.id === currentId && a.id !== currentId) return 1;
  }
  const released = (a.released_at ?? "").localeCompare(b.released_at ?? "");
  if (released !== 0) return released;
  const set = (a.set ?? "").localeCompare(b.set ?? "");
  if (set !== 0) return set;
  return (a.collector_number ?? "").localeCompare(b.collector_number ?? "");
}

/** Choose the lowest known matching price. Missing prices never rank as zero. */
export function pickCheapest(
  printings: ScryfallCard[],
  foil: boolean,
  currency: Currency,
  currentId?: string,
): ScryfallCard | null {
  let cheapest: ScryfallCard | null = null;
  let cheapestPrice = Number.POSITIVE_INFINITY;

  for (const printing of printings) {
    const price = getPrintingPrice(printing, foil, currency);
    if (price == null) continue;
    if (
      price < cheapestPrice ||
      (price === cheapestPrice &&
        cheapest !== null &&
        tieBreak(printing, cheapest, currentId) < 0)
    ) {
      cheapest = printing;
      cheapestPrice = price;
    }
  }
  return cheapest;
}

export function sortPrintingsByPrice(
  printings: ScryfallCard[],
  foil: boolean,
  currency: Currency,
  currentId?: string,
): ScryfallCard[] {
  return [...printings].sort((a, b) => {
    const aPrice = getPrintingPrice(a, foil, currency);
    const bPrice = getPrintingPrice(b, foil, currency);
    if (aPrice == null && bPrice == null) return tieBreak(a, b, currentId);
    if (aPrice == null) return 1;
    if (bPrice == null) return -1;
    return aPrice - bPrice || tieBreak(a, b, currentId);
  });
}
