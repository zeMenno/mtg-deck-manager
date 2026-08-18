/**
 * Recommendation threshold config — persisted in settings.
 */

import type { DeckBuilderDatabase } from "@/lib/db/database";
import { getDatabase } from "@/lib/db/database";
import { SettingsRepository } from "@/lib/db/repositories";
import {
  DEFAULT_RECOMMENDATION_CONFIG,
  type RecommendationConfig,
} from "@/types/deck-validation";

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function normalizeRecommendationConfig(
  partial: Partial<RecommendationConfig>,
  base: RecommendationConfig = DEFAULT_RECOMMENDATION_CONFIG,
): RecommendationConfig {
  const next: RecommendationConfig = {
    minLands: clamp(partial.minLands ?? base.minLands, 0, 99),
    maxLands: clamp(partial.maxLands ?? base.maxLands, 1, 100),
    minRamp: clamp(partial.minRamp ?? base.minRamp, 0, 50),
    minCardDraw: clamp(partial.minCardDraw ?? base.minCardDraw, 0, 50),
    minRemoval: clamp(partial.minRemoval ?? base.minRemoval, 0, 50),
    maxAverageCmc:
      partial.maxAverageCmc !== undefined
        ? Math.min(10, Math.max(0, Number(partial.maxAverageCmc)))
        : base.maxAverageCmc,
  };

  if (next.maxLands < next.minLands) {
    next.maxLands = next.minLands;
  }

  return next;
}

export class RecommendationConfigService {
  constructor(private readonly database?: DeckBuilderDatabase) {}

  private settingsRepo() {
    return new SettingsRepository(this.database ?? getDatabase());
  }

  async get(): Promise<RecommendationConfig> {
    const stored = await this.settingsRepo().get("recommendationConfig");
    return normalizeRecommendationConfig(stored ?? {});
  }

  async update(
    partial: Partial<RecommendationConfig>,
  ): Promise<RecommendationConfig> {
    const current = await this.get();
    const next = normalizeRecommendationConfig(partial, current);
    await this.settingsRepo().set("recommendationConfig", next);
    return next;
  }

  async reset(): Promise<RecommendationConfig> {
    await this.settingsRepo().set(
      "recommendationConfig",
      DEFAULT_RECOMMENDATION_CONFIG,
    );
    return { ...DEFAULT_RECOMMENDATION_CONFIG };
  }
}

export const recommendationConfigService = new RecommendationConfigService();
