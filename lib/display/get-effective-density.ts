import type { DisplayPreferences } from "@/lib/display/types";
import type { DisplayDensity } from "@/types";

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
  return prefs.density;
}
