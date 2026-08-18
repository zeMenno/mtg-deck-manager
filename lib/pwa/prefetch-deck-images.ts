import {
  CARD_IMAGES_CACHE,
  PREFETCH_CHUNK_SIZE,
} from "@/lib/display/constants";
import {
  getCardImageUrlForTier,
  isAllowedCardImageUrl,
} from "@/lib/display/get-card-image-url";
import { nowIso } from "@/lib/db/ids";
import { getDatabase } from "@/lib/db/database";
import type { Card } from "@/types/card";
import type { DeckCardWithCard } from "@/types/deck";

export type PrefetchProgress = {
  done: number;
  total: number;
  failedUrls: string[];
  cancelled: boolean;
};

export type DeckImageCacheMeta = {
  cachedAt: string;
  imageCount: number;
  failedUrls: string[];
};

export function deckImageCacheMetaKey(deckId: string): string {
  return `deckImageCache.${deckId}`;
}

/** Collect unique imageNormal (fallback small) URLs for a deck. */
export function collectDeckImageUrls(
  cards: Array<Pick<DeckCardWithCard, "card"> | { card: Card }>,
): string[] {
  const urls = new Set<string>();
  for (const row of cards) {
    const url =
      getCardImageUrlForTier(row.card, "normal") ??
      getCardImageUrlForTier(row.card, "small");
    if (url && isAllowedCardImageUrl(url)) {
      urls.add(url);
    }
  }
  return [...urls];
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

async function cacheUrl(cache: Cache, url: string): Promise<"ok" | "fail"> {
  try {
    const existing = await cache.match(url);
    if (existing) return "ok";
    const response = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!response.ok) return "fail";
    await cache.put(url, response.clone());
    return "ok";
  } catch {
    return "fail";
  }
}

/**
 * Prefetch deck card images into Cache Storage (`card-images-v1`).
 * Does not store blobs in Dexie. Best-effort; iOS may evict caches.
 */
export async function prefetchDeckImages(
  deckId: string,
  cards: Array<Pick<DeckCardWithCard, "card"> | { card: Card }>,
  options?: {
    onProgress?: (progress: PrefetchProgress) => void;
    signal?: AbortSignal;
  },
): Promise<DeckImageCacheMeta> {
  const urls = collectDeckImageUrls(cards);
  const failedUrls: string[] = [];
  let done = 0;
  const total = urls.length;

  const report = (cancelled = false) => {
    options?.onProgress?.({
      done,
      total,
      failedUrls: [...failedUrls],
      cancelled,
    });
  };

  report();

  if (total === 0 || typeof caches === "undefined") {
    const meta: DeckImageCacheMeta = {
      cachedAt: nowIso(),
      imageCount: 0,
      failedUrls: [],
    };
    await persistMeta(deckId, meta);
    return meta;
  }

  const cache = await caches.open(CARD_IMAGES_CACHE);
  const batches = chunk(urls, PREFETCH_CHUNK_SIZE);

  for (const batch of batches) {
    if (options?.signal?.aborted) {
      report(true);
      break;
    }

    // Notify SW so runtime handlers stay warm (optional).
    try {
      const registration = await navigator.serviceWorker?.ready;
      registration?.active?.postMessage({
        type: "PREFETCH_CARD_IMAGES",
        urls: batch,
        deckId,
      });
    } catch {
      // Ignore — Cache API path below is authoritative.
    }

    await Promise.all(
      batch.map(async (url) => {
        if (options?.signal?.aborted) return;
        const result = await cacheUrl(cache, url);
        if (result === "fail") failedUrls.push(url);
        done += 1;
        report(Boolean(options?.signal?.aborted));
      }),
    );
  }

  const meta: DeckImageCacheMeta = {
    cachedAt: nowIso(),
    imageCount: total - failedUrls.length,
    failedUrls,
  };
  await persistMeta(deckId, meta);
  return meta;
}

async function persistMeta(
  deckId: string,
  meta: DeckImageCacheMeta,
): Promise<void> {
  try {
    await getDatabase().appMeta.put({
      key: deckImageCacheMetaKey(deckId),
      value: meta,
      updatedAt: nowIso(),
    });
  } catch {
    // Non-fatal
  }
}

export async function getDeckImageCacheMeta(
  deckId: string,
): Promise<DeckImageCacheMeta | null> {
  try {
    const row = await getDatabase().appMeta.get(deckImageCacheMetaKey(deckId));
    if (!row?.value || typeof row.value !== "object") return null;
    return row.value as DeckImageCacheMeta;
  } catch {
    return null;
  }
}
