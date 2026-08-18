"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRecommendationConfig } from "@/lib/hooks/use-recommendation-config";
import type { RecommendationConfig } from "@/types/deck-validation";

const FIELDS: Array<{
  key: keyof RecommendationConfig;
  label: string;
  min: number;
  max: number;
  step?: number;
}> = [
  { key: "minLands", label: "Min lands", min: 0, max: 99 },
  { key: "maxLands", label: "Max lands", min: 1, max: 100 },
  { key: "minRamp", label: "Min ramp", min: 0, max: 50 },
  { key: "minCardDraw", label: "Min card draw", min: 0, max: 50 },
  { key: "minRemoval", label: "Min removal", min: 0, max: 50 },
  {
    key: "maxAverageCmc",
    label: "Max avg. mana value",
    min: 0,
    max: 10,
    step: 0.1,
  },
];

export function RecommendationSettings() {
  const { config, hydrated, saving, update, reset } = useRecommendationConfig();

  async function handleChange(key: keyof RecommendationConfig, raw: string) {
    const value = Number(raw);
    if (Number.isNaN(value)) return;
    try {
      await update({ [key]: value });
    } catch {
      toast.error("Could not save recommendation settings");
    }
  }

  return (
    <section
      className="border-border bg-card shadow-brutal-sm flex flex-col gap-4 border-2 p-4"
      data-testid="recommendation-settings"
    >
      <div>
        <h2 className="font-mono text-xs uppercase">Deck preferences</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Recommendation thresholds for Commander deck checks. These never
          appear as legality errors.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <label key={field.key} className="flex flex-col gap-1">
            <span className="font-mono text-[0.625rem] uppercase">
              {field.label}
            </span>
            <Input
              type="number"
              min={field.min}
              max={field.max}
              step={field.step ?? 1}
              disabled={!hydrated || saving}
              value={config[field.key] ?? ""}
              data-testid={`rec-setting-${field.key}`}
              onChange={(e) => void handleChange(field.key, e.target.value)}
            />
          </label>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!hydrated || saving}
        data-testid="rec-settings-reset"
        onClick={() => {
          void reset()
            .then(() => toast.success("Reset to defaults"))
            .catch(() => toast.error("Could not reset"));
        }}
      >
        Reset to defaults
      </Button>
    </section>
  );
}
