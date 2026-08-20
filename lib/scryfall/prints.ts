import { searchCards } from "@/lib/scryfall/client";
import type { ScryfallCard, ScryfallSearchResult } from "@/lib/scryfall/types";
import type { Currency } from "@/types";

export type PrintingFilters = {
  currency?: Currency;
  anyLanguage?: boolean;
  includeExtras?: boolean;
};

export type ListPrintingsOptions = PrintingFilters & {
  searchFn?: typeof searchCards;
};

/** Load every filtered paper printing for one oracle identity, sequentially. */
export async function listPrintings(
  oracleId: string,
  options: ListPrintingsOptions = {},
): Promise<ScryfallCard[]> {
  if (!oracleId.trim()) return [];

  const query = [
    `oracleid:${oracleId}`,
    "game:paper",
    options.anyLanguage ? null : "lang:en",
    "-is:oversized",
  ]
    .filter(Boolean)
    .join(" ");
  const search = options.searchFn ?? searchCards;
  const printings: ScryfallCard[] = [];
  let page = 1;
  let response: ScryfallSearchResult;

  do {
    response = await search(query, {
      page,
      unique: "prints",
      order: options.currency === "EUR" ? "eur" : "usd",
      dir: "asc",
      includeExtras: options.includeExtras ?? false,
    });
    printings.push(...response.data);
    page += 1;
  } while (response.has_more);

  return printings;
}
