"use client";

import { useCallback, useEffect, useRef } from "react";

import { useDatabase } from "@/components/providers/database-provider";
import { getEffectiveDensity } from "@/lib/display/get-effective-density";
import type { DisplayPreferences } from "@/lib/display/types";
import { SettingsRepository } from "@/lib/db/repositories";
import { useDisplayPreferencesStore } from "@/store/display-preferences-store";
import type { DisplayDensity } from "@/types";

const PERSIST_DEBOUNCE_MS = 300;

function needsImages(density: DisplayDensity): boolean {
  return density === "image" || density === "grid";
}

/**
 * Reactive display preferences with optimistic Zustand updates and
 * debounced Dexie persistence (`imagesEnabled`, `densityMode`, zoom keys).
 */
export function useDisplayPreferences() {
  const { ready } = useDatabase();
  const imagesEnabled = useDisplayPreferencesStore((s) => s.imagesEnabled);
  const density = useDisplayPreferencesStore((s) => s.density);
  const hoverPreview = useDisplayPreferencesStore((s) => s.hoverPreview);
  const tapImageOpensZoom = useDisplayPreferencesStore(
    (s) => s.tapImageOpensZoom,
  );
  const hydrated = useDisplayPreferencesStore((s) => s.hydrated);
  const hydrate = useDisplayPreferencesStore((s) => s.hydrate);
  const setImagesEnabledStore = useDisplayPreferencesStore(
    (s) => s.setImagesEnabled,
  );
  const setDensityStore = useDisplayPreferencesStore((s) => s.setDensity);
  const setHoverPreviewStore = useDisplayPreferencesStore(
    (s) => s.setHoverPreview,
  );
  const setTapImageOpensZoomStore = useDisplayPreferencesStore(
    (s) => s.setTapImageOpensZoom,
  );

  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Partial<DisplayPreferences>>({});

  useEffect(() => {
    if (!ready || hydrated) return;
    void new SettingsRepository().getTyped().then((settings) => {
      hydrate({
        imagesEnabled: settings.imagesEnabled,
        density: settings.densityMode,
        hoverPreview: settings["cardZoom.hoverPreview"],
        tapImageOpensZoom: settings["cardZoom.tapImageOpensZoom"],
      });
    });
  }, [ready, hydrated, hydrate]);

  const flushPersist = useCallback(async () => {
    const batch = pending.current;
    pending.current = {};
    const repo = new SettingsRepository();
    if (batch.imagesEnabled !== undefined) {
      await repo.set("imagesEnabled", batch.imagesEnabled);
    }
    if (batch.density !== undefined) {
      await repo.set("densityMode", batch.density);
    }
    if (batch.hoverPreview !== undefined) {
      await repo.set("cardZoom.hoverPreview", batch.hoverPreview);
    }
    if (batch.tapImageOpensZoom !== undefined) {
      await repo.set("cardZoom.tapImageOpensZoom", batch.tapImageOpensZoom);
    }
  }, []);

  const schedulePersist = useCallback(
    (patch: Partial<DisplayPreferences>) => {
      pending.current = { ...pending.current, ...patch };
      if (persistTimer.current) clearTimeout(persistTimer.current);
      persistTimer.current = setTimeout(() => {
        void flushPersist();
      }, PERSIST_DEBOUNCE_MS);
    },
    [flushPersist],
  );

  useEffect(() => {
    return () => {
      if (persistTimer.current) {
        clearTimeout(persistTimer.current);
        void flushPersist();
      }
    };
  }, [flushPersist]);

  const setImagesEnabled = useCallback(
    (next: boolean) => {
      setImagesEnabledStore(next);
      schedulePersist({ imagesEnabled: next });
    },
    [schedulePersist, setImagesEnabledStore],
  );

  const setDensity = useCallback(
    (next: DisplayDensity) => {
      setDensityStore(next);
      schedulePersist({ density: next });
    },
    [schedulePersist, setDensityStore],
  );

  const setHoverPreview = useCallback(
    (next: boolean) => {
      setHoverPreviewStore(next);
      schedulePersist({ hoverPreview: next });
    },
    [schedulePersist, setHoverPreviewStore],
  );

  const setTapImageOpensZoom = useCallback(
    (next: boolean) => {
      setTapImageOpensZoomStore(next);
      schedulePersist({ tapImageOpensZoom: next });
    },
    [schedulePersist, setTapImageOpensZoomStore],
  );

  /** Selecting Image or Grid while images are OFF re-enables images. */
  const setDensityOrEnable = useCallback(
    (next: DisplayDensity) => {
      if (needsImages(next) && !imagesEnabled) {
        setImagesEnabledStore(true);
        setDensityStore(next);
        schedulePersist({ imagesEnabled: true, density: next });
        return;
      }
      setDensity(next);
    },
    [
      imagesEnabled,
      schedulePersist,
      setDensity,
      setDensityStore,
      setImagesEnabledStore,
    ],
  );

  const effectiveDensity = getEffectiveDensity({ imagesEnabled, density });

  return {
    imagesEnabled,
    density,
    hoverPreview,
    tapImageOpensZoom,
    effectiveDensity,
    hydrated,
    setImagesEnabled,
    setDensity: setDensityOrEnable,
    setHoverPreview,
    setTapImageOpensZoom,
    preferences: {
      imagesEnabled,
      density,
      hoverPreview,
      tapImageOpensZoom,
    } satisfies DisplayPreferences,
  };
}
