import type { CardImageSize, CardImageUrlTier } from "@/lib/display/types";
import type { DisplayDensity } from "@/types";

/** Tailwind size classes for CardImage variants. */
export const IMAGE_SIZE_CLASS: Record<CardImageSize, string> = {
  xs: "h-12 w-[34px]",
  sm: "h-[88px] w-[63px]",
  md: "aspect-[488/680] w-full max-w-[12rem]",
  lg: "aspect-[488/680] w-full max-w-sm",
  full: "aspect-[488/680] w-full",
};

/** Map UI size → Scryfall URL tier. */
export const SIZE_TO_URL_TIER: Record<CardImageSize, CardImageUrlTier> = {
  xs: "small",
  sm: "small",
  md: "normal",
  lg: "large",
  full: "large",
};

/** Estimated row heights for virtualizer (px). */
export const DENSITY_ROW_HEIGHT: Record<DisplayDensity, number> = {
  compact: 64,
  comfortable: 88,
  image: 112,
};

/** Virtualize flat lists in image mode above this count. */
export const IMAGE_MODE_VIRTUALIZE_THRESHOLD = 75;

export const SCRYFALL_IMAGE_HOSTS = [
  "https://cards.scryfall.io/",
  "https://c1.scryfall.com/",
] as const;

export const CARD_IMAGES_CACHE = "card-images-v1";

export const PREFETCH_CHUNK_SIZE = 20;
