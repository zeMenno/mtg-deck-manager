import type { DisplayDensity } from "@/types";

export type { DisplayDensity };

export interface DisplayPreferences {
  /** Master toggle — when false, lists force compact (no thumbnails). */
  imagesEnabled: boolean;
  /** Preferred density when images are enabled. */
  density: DisplayDensity;
  /** Fine-pointer hover preview of card art. */
  hoverPreview: boolean;
  /** Tap/click list thumbnails to open the zoom overlay. */
  tapImageOpensZoom: boolean;
}

export type CardImageSize = "xs" | "sm" | "md" | "lg" | "full" | "tile";

export type CardImageUrlTier = "small" | "normal" | "large";
