import type { DisplayDensity } from "@/types";

export type { DisplayDensity };

export interface DisplayPreferences {
  /** Master toggle — when false, lists force compact (no thumbnails). */
  imagesEnabled: boolean;
  /** Preferred density when images are enabled. */
  density: DisplayDensity;
}

export type CardImageSize = "xs" | "sm" | "md" | "lg" | "full";

export type CardImageUrlTier = "small" | "normal" | "large";
