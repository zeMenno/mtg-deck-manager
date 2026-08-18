"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useDeckCards } from "@/lib/hooks/use-deck-cards";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import {
  getDeckImageCacheMeta,
  prefetchDeckImages,
  type DeckImageCacheMeta,
  type PrefetchProgress,
} from "@/lib/pwa/prefetch-deck-images";

type PrefetchDeckImagesButtonProps = {
  deckId: string;
};

function formatCachedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

/**
 * Dashboard action: download active deck images into Cache Storage for offline.
 */
export function PrefetchDeckImagesButton({
  deckId,
}: PrefetchDeckImagesButtonProps) {
  const { cards, isLoading } = useDeckCards(deckId);
  const online = useOnlineStatus();
  const [meta, setMeta] = useState<DeckImageCacheMeta | null>(null);
  const [progress, setProgress] = useState<PrefetchProgress | null>(null);
  const [running, setRunning] = useState(false);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

  useEffect(() => {
    void getDeckImageCacheMeta(deckId).then(setMeta);
  }, [deckId]);

  const cancel = useCallback(() => {
    abortController?.abort();
  }, [abortController]);

  const start = useCallback(async () => {
    if (running) return;
    const controller = new AbortController();
    setAbortController(controller);
    setRunning(true);
    setProgress({ done: 0, total: 0, failedUrls: [], cancelled: false });

    try {
      const result = await prefetchDeckImages(deckId, cards, {
        signal: controller.signal,
        onProgress: setProgress,
      });
      setMeta(result);
      if (controller.signal.aborted) {
        toast.message("Image download cancelled");
      } else if (result.failedUrls.length > 0) {
        toast.success(
          `Cached ${result.imageCount} images (${result.failedUrls.length} failed)`,
        );
      } else {
        toast.success(`Cached ${result.imageCount} deck images`);
      }
    } catch {
      toast.error("Could not cache deck images");
    } finally {
      setRunning(false);
      setAbortController(null);
      setProgress(null);
    }
  }, [cards, deckId, running]);

  const label = running ? "Cancel download" : "Download images for offline";

  return (
    <div
      className="border-border flex flex-col gap-2 border-2 p-3"
      data-testid="prefetch-deck-images"
    >
      <Button
        type="button"
        variant="outline"
        data-testid="prefetch-deck-images-btn"
        disabled={isLoading || (!online && !running)}
        onClick={() => {
          if (running) {
            cancel();
            return;
          }
          void start();
        }}
      >
        {label}
      </Button>
      {running && progress ? (
        <div className="flex flex-col gap-1">
          <div
            className="border-border bg-muted h-3 w-full border-2"
            role="progressbar"
            aria-valuenow={progress.done}
            aria-valuemin={0}
            aria-valuemax={progress.total || 1}
            data-testid="prefetch-progress"
          >
            <div
              className="bg-primary h-full transition-[width]"
              style={{
                width:
                  progress.total === 0
                    ? "0%"
                    : `${Math.round((progress.done / progress.total) * 100)}%`,
              }}
            />
          </div>
          <p className="text-muted-foreground font-mono text-xs">
            Caching {progress.done}/{progress.total} images…
          </p>
        </div>
      ) : null}
      {meta && !running ? (
        <p
          className="text-muted-foreground font-mono text-xs"
          data-testid="prefetch-cache-meta"
        >
          Images cached · {formatCachedAt(meta.cachedAt)} · {meta.imageCount}{" "}
          images
          {meta.failedUrls.length > 0
            ? ` · ${meta.failedUrls.length} failed`
            : ""}
        </p>
      ) : null}
      <p className="text-muted-foreground text-xs">
        Stores Scryfall art in the browser cache only (not IndexedDB). iOS may
        clear this cache under storage pressure.
      </p>
    </div>
  );
}
