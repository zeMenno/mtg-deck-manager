"use client";

import { DisplayDensityPicker } from "@/components/settings/display-density-picker";
import { Button } from "@/components/ui/button";
import { useDisplayPreferences } from "@/lib/hooks/use-display-preferences";
import { cn } from "@/lib/utils";

type DeckListToolbarProps = {
  className?: string;
};

/**
 * Sticky toolbar: Images ON/OFF + density segmented control.
 */
export function DeckListToolbar({ className }: DeckListToolbarProps) {
  const {
    imagesEnabled,
    density,
    effectiveDensity,
    setImagesEnabled,
    setDensity,
    hydrated,
  } = useDisplayPreferences();

  return (
    <div
      data-testid="deck-list-toolbar"
      className={cn(
        "border-border bg-background/95 sticky top-[calc(env(safe-area-inset-top,0px)+3.5rem)] z-20 -mx-4 flex flex-wrap items-center gap-2 border-y-2 px-4 py-2 backdrop-blur",
        className,
      )}
    >
      <Button
        type="button"
        size="sm"
        variant={imagesEnabled ? "default" : "outline"}
        aria-pressed={imagesEnabled}
        data-testid="images-toggle"
        disabled={!hydrated}
        onClick={() => setImagesEnabled(!imagesEnabled)}
      >
        Images: {imagesEnabled ? "ON" : "OFF"}
      </Button>

      <DisplayDensityPicker
        value={density}
        onChange={setDensity}
        imagesEnabled={imagesEnabled}
        disabled={!hydrated}
      />

      <p
        className="text-muted-foreground w-full font-mono text-[0.625rem] uppercase sm:ml-auto sm:w-auto"
        data-testid="effective-density-label"
      >
        Layout: {effectiveDensity}
        {!imagesEnabled ? " (images off)" : ""}
      </p>
    </div>
  );
}
