import { create } from "zustand";

import type { DisplayPreferences } from "@/lib/display/types";
import type { DisplayDensity } from "@/types";
import { DEFAULT_APP_SETTINGS } from "@/types/card";

type DisplayPreferencesState = DisplayPreferences & {
  hydrated: boolean;
  hydrate: (prefs: DisplayPreferences) => void;
  setImagesEnabled: (imagesEnabled: boolean) => void;
  setDensity: (density: DisplayDensity) => void;
  setHoverPreview: (hoverPreview: boolean) => void;
  setTapImageOpensZoom: (tapImageOpensZoom: boolean) => void;
  setPreferences: (prefs: Partial<DisplayPreferences>) => void;
};

/**
 * Instant UI updates for display prefs; Dexie writes happen in the hook.
 */
export const useDisplayPreferencesStore = create<DisplayPreferencesState>(
  (set) => ({
    imagesEnabled: DEFAULT_APP_SETTINGS.imagesEnabled,
    density: DEFAULT_APP_SETTINGS.densityMode,
    hoverPreview: DEFAULT_APP_SETTINGS["cardZoom.hoverPreview"],
    tapImageOpensZoom: DEFAULT_APP_SETTINGS["cardZoom.tapImageOpensZoom"],
    hydrated: false,

    hydrate: (prefs) =>
      set({
        imagesEnabled: prefs.imagesEnabled,
        density: prefs.density,
        hoverPreview: prefs.hoverPreview,
        tapImageOpensZoom: prefs.tapImageOpensZoom,
        hydrated: true,
      }),

    setImagesEnabled: (imagesEnabled) => set({ imagesEnabled }),

    setDensity: (density) => set({ density }),

    setHoverPreview: (hoverPreview) => set({ hoverPreview }),

    setTapImageOpensZoom: (tapImageOpensZoom) => set({ tapImageOpensZoom }),

    setPreferences: (prefs) => set((state) => ({ ...state, ...prefs })),
  }),
);
