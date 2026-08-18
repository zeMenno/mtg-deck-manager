"use client";

import { useCallback, useEffect, useState } from "react";

import { useDatabase } from "@/components/providers/database-provider";
import { recommendationConfigService } from "@/lib/services/recommendation-config-service";
import {
  DEFAULT_RECOMMENDATION_CONFIG,
  type RecommendationConfig,
} from "@/types/deck-validation";

/**
 * Reactive recommendation thresholds from Settings.
 */
export function useRecommendationConfig() {
  const { ready } = useDatabase();
  const [config, setConfig] = useState<RecommendationConfig>(
    DEFAULT_RECOMMENDATION_CONFIG,
  );
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void recommendationConfigService.get().then((value) => {
      if (cancelled) return;
      setConfig(value);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  const update = useCallback(async (partial: Partial<RecommendationConfig>) => {
    setSaving(true);
    try {
      const next = await recommendationConfigService.update(partial);
      setConfig(next);
      return next;
    } finally {
      setSaving(false);
    }
  }, []);

  const reset = useCallback(async () => {
    setSaving(true);
    try {
      const next = await recommendationConfigService.reset();
      setConfig(next);
      return next;
    } finally {
      setSaving(false);
    }
  }, []);

  return { config, hydrated, saving, update, reset };
}
