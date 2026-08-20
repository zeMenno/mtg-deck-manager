import type { DisplayPreferences } from "@/lib/display/types";
import type { DisplayDensity } from "@/types";

const DENSITIES: readonly DisplayDensity[] = [
  "compact",
  "comfortable",
  "image",
  "grid",
];

/** Unknown persisted values fall back to comfortable (ADR-027). */
export function parseDisplayDensity(value: unknown): DisplayDensity {
  if (
    typeof value === "string" &&
    DENSITIES.includes(value as DisplayDensity)
  ) {
    return value as DisplayDensity;
  }
  return "comfortable";
}

/**
 * When images are disabled, force compact list layout (no thumbnails).
 * Card detail / commander hero may still show art independently.
 */
export function getEffectiveDensity(
  prefs: Pick<DisplayPreferences, "imagesEnabled" | "density">,
): DisplayDensity {
  if (!prefs.imagesEnabled) {
    return "compact";
  }
  return parseDisplayDensity(prefs.density);
}
