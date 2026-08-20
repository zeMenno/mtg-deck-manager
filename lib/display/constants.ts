import type { CardImageSize, CardImageUrlTier } from "@/lib/display/types";
import type { DisplayDensity } from "@/types";

/** Tailwind size classes for CardImage variants. */
export const IMAGE_SIZE_CLASS: Record<CardImageSize, string> = {
  xs: "h-12 w-[34px]",
  sm: "h-[88px] w-[63px]",
  md: "aspect-[488/680] w-full max-w-[12rem]",
  lg: "aspect-[488/680] w-full max-w-sm",
  full: "aspect-[488/680] w-full",
  tile: "aspect-[488/680] w-full",
};

/** Map UI size → Scryfall URL tier. */
export const SIZE_TO_URL_TIER: Record<CardImageSize, CardImageUrlTier> = {
  xs: "small",
  sm: "small",
  md: "normal",
  lg: "large",
  full: "large",
  tile: "normal",
};

/** Estimated row heights for virtualizer (px). */
export const DENSITY_ROW_HEIGHT: Record<DisplayDensity, number> = {
  compact: 64,
  comfortable: 88,
  image: 112,
  grid: 280,
};

/** Virtualize flat lists in image mode above this count. */
export const IMAGE_MODE_VIRTUALIZE_THRESHOLD = 75;

/** Per-zone grid virtualization threshold (unused until containment is not enough). */
export const GRID_VIRTUALIZE_THRESHOLD = 200;

export const SCRYFALL_IMAGE_HOSTS = [
  "https://cards.scryfall.io/",
  "https://c1.scryfall.com/",
] as const;

export const CARD_IMAGES_CACHE = "card-images-v1";

export const PREFETCH_CHUNK_SIZE = 20;

export const LONG_PRESS_MS = 450;
export const HOVER_PREVIEW_DELAY_MS = 120;
export const ZOOM_FIT_SCALE = 1;
export const ZOOM_DOUBLE_TAP_SCALE = 2.2;
export const ZOOM_MIN_SCALE = 1;
export const ZOOM_MAX_SCALE = 4;
