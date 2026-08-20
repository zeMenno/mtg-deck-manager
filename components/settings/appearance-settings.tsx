"use client";

import { DisplayDensityPicker } from "@/components/settings/display-density-picker";
import { ThemePicker } from "@/components/settings/theme-picker";
import { Button } from "@/components/ui/button";
import { useDisplayPreferences } from "@/lib/hooks/use-display-preferences";

/**
 * Settings → Appearance: color theme, images, and list density.
 */
export function AppearanceSettings() {
  const {
    imagesEnabled,
    density,
    effectiveDensity,
    hoverPreview,
    tapImageOpensZoom,
    setImagesEnabled,
    setDensity,
    setHoverPreview,
    setTapImageOpensZoom,
    hydrated,
  } = useDisplayPreferences();

  return (
    <section
      className="border-border bg-card flex flex-col gap-5 rounded-lg border p-4 shadow-sm"
      data-testid="appearance-settings"
    >
      <div>
        <h2 className="font-mono text-xs uppercase">Appearance</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Control how card lists look. Card detail always shows art when
          available, even if Images is OFF.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold">Color theme</span>
        <ThemePicker />
        <p className="text-muted-foreground text-xs">
          Dark is the default. Your explicit choice stays on this device.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold">Card images in lists</span>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={imagesEnabled ? "default" : "outline"}
            aria-pressed={imagesEnabled}
            data-testid="settings-images-on"
            disabled={!hydrated}
            onClick={() => setImagesEnabled(true)}
          >
            Images ON
          </Button>
          <Button
            type="button"
            size="sm"
            variant={!imagesEnabled ? "default" : "outline"}
            aria-pressed={!imagesEnabled}
            data-testid="settings-images-off"
            disabled={!hydrated}
            onClick={() => setImagesEnabled(false)}
          >
            Images OFF
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold">List density</span>
        <DisplayDensityPicker
          value={density}
          onChange={setDensity}
          imagesEnabled={imagesEnabled}
          disabled={!hydrated}
          size="default"
        />
        <p className="text-muted-foreground font-mono text-xs">
          Effective layout: {effectiveDensity}
          {!imagesEnabled ? " — images off forces compact lists" : ""}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold">Card zoom</span>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={hoverPreview ? "default" : "outline"}
            aria-pressed={hoverPreview}
            data-testid="settings-hover-preview"
            disabled={!hydrated}
            onClick={() => setHoverPreview(!hoverPreview)}
          >
            Hover preview: {hoverPreview ? "ON" : "OFF"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tapImageOpensZoom ? "default" : "outline"}
            aria-pressed={tapImageOpensZoom}
            data-testid="settings-tap-image-zoom"
            disabled={!hydrated}
            onClick={() => setTapImageOpensZoom(!tapImageOpensZoom)}
          >
            Tap art to zoom: {tapImageOpensZoom ? "ON" : "OFF"}
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          Hover preview is desktop-only. On a phone, tap the art to open the
          magnifier.
        </p>
      </div>

      <div
        className="border-border bg-muted flex flex-col gap-2 rounded-md border p-3"
        aria-hidden="true"
      >
        <p className="font-mono text-[0.625rem] uppercase">Preview</p>
        <DensityPreview density={effectiveDensity} images={imagesEnabled} />
      </div>
    </section>
  );
}

function DensityPreview({
  density,
  images,
}: {
  density: string;
  images: boolean;
}) {
  const showThumb = images && density !== "compact";
  if (density === "grid" && images) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {["Sample Card", "Another Card"].map((name) => (
          <div
            key={name}
            className="border-border bg-card overflow-hidden rounded-md border shadow-xs"
          >
            <div className="bg-background aspect-[488/680] w-full" />
            <p className="truncate px-2 py-1 text-xs font-bold">{name}</p>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="border-border bg-card flex items-center gap-2 rounded-md border p-2 shadow-xs">
      {showThumb ? (
        <div className="border-border bg-background h-14 w-10 shrink-0 rounded-sm border" />
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">Sample Card Name</p>
        {density !== "compact" ? (
          <p className="text-muted-foreground truncate text-xs">
            Creature — Example
          </p>
        ) : null}
        <p className="font-mono text-[0.625rem] uppercase">
          MV 3 · ADD · $0.45
        </p>
      </div>
    </div>
  );
}
