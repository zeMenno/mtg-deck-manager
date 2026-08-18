"use client";

import { DisplayDensityPicker } from "@/components/settings/display-density-picker";
import { Button } from "@/components/ui/button";
import { useDisplayPreferences } from "@/lib/hooks/use-display-preferences";

/**
 * Settings → Appearance: images master toggle + density picker.
 */
export function AppearanceSettings() {
  const {
    imagesEnabled,
    density,
    effectiveDensity,
    setImagesEnabled,
    setDensity,
    hydrated,
  } = useDisplayPreferences();

  return (
    <section
      className="border-border bg-card shadow-brutal-sm flex flex-col gap-4 border-2 p-4"
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
        <span className="font-mono text-[0.625rem] uppercase">
          Card images in lists
        </span>
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
        <span className="font-mono text-[0.625rem] uppercase">
          List density
        </span>
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

      <div
        className="border-border bg-muted flex flex-col gap-2 border-2 p-3"
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
  return (
    <div className="border-border bg-card flex items-center gap-2 border-2 p-2">
      {showThumb ? (
        <div className="border-border bg-background h-14 w-10 shrink-0 border-2" />
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
