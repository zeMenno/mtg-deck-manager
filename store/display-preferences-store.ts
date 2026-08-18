import { create } from "zustand";

import type { DisplayPreferences } from "@/lib/display/types";
import type { DisplayDensity } from "@/types";
import { DEFAULT_APP_SETTINGS } from "@/types/card";

type DisplayPreferencesState = DisplayPreferences & {
  hydrated: boolean;
  hydrate: (prefs: DisplayPreferences) => void;
  setImagesEnabled: (imagesEnabled: boolean) => void;
  setDensity: (density: DisplayDensity) => void;
  setPreferences: (prefs: Partial<DisplayPreferences>) => void;
};

/**
 * Instant UI updates for display prefs; Dexie writes happen in the hook.
 */
export const useDisplayPreferencesStore = create<DisplayPreferencesState>(
  (set) => ({
    imagesEnabled: DEFAULT_APP_SETTINGS.imagesEnabled,
    density: DEFAULT_APP_SETTINGS.densityMode,
    hydrated: false,

    hydrate: (prefs) =>
      set({
        imagesEnabled: prefs.imagesEnabled,
        density: prefs.density,
        hydrated: true,
      }),

    setImagesEnabled: (imagesEnabled) => set({ imagesEnabled }),

    setDensity: (density) => set({ density }),

    setPreferences: (prefs) => set((state) => ({ ...state, ...prefs })),
  }),
);
