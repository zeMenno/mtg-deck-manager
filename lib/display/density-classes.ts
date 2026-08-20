import { DENSITY_ROW_HEIGHT } from "@/lib/display/constants";
import type { DisplayDensity } from "@/types";

export type RowDisplayDensity = Exclude<DisplayDensity, "grid">;

/** Rows never render as a grid; map grid to comfortable. */
export function toRowDensity(density: DisplayDensity): RowDisplayDensity {
  return density === "grid" ? "comfortable" : density;
}

/** Row container classes per density. */
export function getDensityRowClass(density: DisplayDensity): string {
  const rowDensity = toRowDensity(density);
  switch (rowDensity) {
    case "compact":
      return "gap-2 p-2 py-2";
    case "comfortable":
      return "gap-3 p-3";
    case "image":
      return "gap-3 p-2";
    default: {
      const _exhaustive: never = rowDensity;
      return _exhaustive;
    }
  }
}

export function getDensityNameClass(density: DisplayDensity): string {
  const rowDensity = toRowDensity(density);
  switch (rowDensity) {
    case "compact":
      return "truncate text-sm font-bold";
    case "comfortable":
      return "truncate font-bold";
    case "image":
      return "truncate text-sm font-bold leading-tight";
    default: {
      const _exhaustive: never = rowDensity;
      return _exhaustive;
    }
  }
}

export function estimateRowHeight(density: DisplayDensity): number {
  return DENSITY_ROW_HEIGHT[density];
}
