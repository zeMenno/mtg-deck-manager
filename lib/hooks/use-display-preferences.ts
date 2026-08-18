"use client";

import { useCallback, useEffect, useRef } from "react";

import { useDatabase } from "@/components/providers/database-provider";
import { getEffectiveDensity } from "@/lib/display/get-effective-density";
import type { DisplayPreferences } from "@/lib/display/types";
import { SettingsRepository } from "@/lib/db/repositories";
import { useDisplayPreferencesStore } from "@/store/display-preferences-store";
import type { DisplayDensity } from "@/types";

const PERSIST_DEBOUNCE_MS = 300;

/**
 * Reactive display preferences with optimistic Zustand updates and
 * debounced Dexie persistence (`imagesEnabled`, `densityMode`).
 */
export function useDisplayPreferences() {
  const { ready } = useDatabase();
  const imagesEnabled = useDisplayPreferencesStore((s) => s.imagesEnabled);
  const density = useDisplayPreferencesStore((s) => s.density);
  const hydrated = useDisplayPreferencesStore((s) => s.hydrated);
  const hydrate = useDisplayPreferencesStore((s) => s.hydrate);
  const setImagesEnabledStore = useDisplayPreferencesStore(
    (s) => s.setImagesEnabled,
  );
  const setDensityStore = useDisplayPreferencesStore((s) => s.setDensity);

  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Partial<DisplayPreferences>>({});

  useEffect(() => {
    if (!ready || hydrated) return;
    void new SettingsRepository().getTyped().then((settings) => {
      hydrate({
        imagesEnabled: settings.imagesEnabled,
        density: settings.densityMode,
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

  /** Selecting Image while images are OFF re-enables images. */
  const setDensityOrEnable = useCallback(
    (next: DisplayDensity) => {
      if (next === "image" && !imagesEnabled) {
        setImagesEnabledStore(true);
        setDensityStore("image");
        schedulePersist({ imagesEnabled: true, density: "image" });
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
    effectiveDensity,
    hydrated,
    setImagesEnabled,
    setDensity: setDensityOrEnable,
    preferences: { imagesEnabled, density } satisfies DisplayPreferences,
  };
}
