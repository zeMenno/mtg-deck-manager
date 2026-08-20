/** Responsive tile columns — shared so wishlist/search can reuse later. */
export const GRID_COLUMNS_CLASS =
  "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

export function getTileMetaClass(): string {
  return "flex min-h-11 flex-col gap-1 p-2 text-left";
}

/**
 * Approximate tile height for a given column width (art 488/680 + meta strip).
 */
export function estimateTileHeight(columnWidthPx: number): number {
  const artHeight = columnWidthPx * (680 / 488);
  const metaStripPx = 88;
  return Math.round(artHeight + metaStripPx);
}
