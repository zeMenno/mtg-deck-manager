/**
 * Service worker / Cache Storage names shared by `app/sw.ts` and tests.
 * Bump CACHE_VERSION when strategies change in a way that must invalidate
 * already-cached assets on devices.
 */

export const CACHE_VERSION = "v1";

export const APP_SHELL_CACHE = `app-shell-${CACHE_VERSION}`;
export const STATIC_CACHE = `static-${CACHE_VERSION}`;
/** Scryfall card art — shared with client prefetch (Phase 9). */
export const CARD_IMAGES_CACHE = `card-images-${CACHE_VERSION}`;

/** All named caches owned by this app (for cleanup assertions). */
export const APP_CACHE_NAMES = [
  APP_SHELL_CACHE,
  STATIC_CACHE,
  CARD_IMAGES_CACHE,
] as const;

/**
 * Returns cache names that look like superseded app caches for a prior version.
 * Used by unit tests documenting cleanupOutdatedCaches expectations.
 */
export function supersededCacheNames(previousVersion: string): string[] {
  return [
    `app-shell-${previousVersion}`,
    `static-${previousVersion}`,
    `card-images-${previousVersion}`,
  ];
}
