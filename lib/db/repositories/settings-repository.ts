import type { DeckBuilderDatabase } from "@/lib/db/database";
import { getDatabase } from "@/lib/db/database";
import { nowIso } from "@/lib/db/ids";
import {
  DEFAULT_APP_SETTINGS,
  type AppSetting,
  type AppSettings,
  type SettingKey,
} from "@/types/card";
import type { RecommendationConfig } from "@/types/deck-validation";

export class SettingsRepository {
  constructor(private readonly database: DeckBuilderDatabase = getDatabase()) {}

  async get<K extends SettingKey>(key: K): Promise<AppSettings[K]> {
    const row = await this.database.settings.get(key);
    if (row === undefined) {
      return DEFAULT_APP_SETTINGS[key];
    }
    return row.value as AppSettings[K];
  }

  async set<K extends SettingKey>(
    key: K,
    value: AppSettings[K],
  ): Promise<AppSetting> {
    const record: AppSetting = {
      key,
      value,
      updatedAt: nowIso(),
    };
    await this.database.settings.put(record);
    return record;
  }

  async getAll(): Promise<AppSetting[]> {
    return this.database.settings.toArray();
  }

  /** Merged typed settings with defaults for missing keys. */
  async getTyped(): Promise<AppSettings> {
    const rows = await this.getAll();
    const map = new Map(rows.map((row) => [row.key, row.value]));
    return {
      imagesEnabled:
        (map.get("imagesEnabled") as boolean | undefined) ??
        DEFAULT_APP_SETTINGS.imagesEnabled,
      densityMode:
        (map.get("densityMode") as AppSettings["densityMode"] | undefined) ??
        DEFAULT_APP_SETTINGS.densityMode,
      currency:
        (map.get("currency") as AppSettings["currency"] | undefined) ??
        DEFAULT_APP_SETTINGS.currency,
      priceFreshnessHours:
        (map.get("priceFreshnessHours") as number | undefined) ??
        DEFAULT_APP_SETTINGS.priceFreshnessHours,
      lastBackupAt: map.has("lastBackupAt")
        ? (map.get("lastBackupAt") as string | null)
        : DEFAULT_APP_SETTINGS.lastBackupAt,
      installBannerDismissed:
        (map.get("installBannerDismissed") as boolean | undefined) ??
        DEFAULT_APP_SETTINGS.installBannerDismissed,
      activeDeckId: map.has("activeDeckId")
        ? (map.get("activeDeckId") as string | null)
        : DEFAULT_APP_SETTINGS.activeDeckId,
      recommendationConfig:
        (map.get("recommendationConfig") as RecommendationConfig | undefined) ??
        DEFAULT_APP_SETTINGS.recommendationConfig,
      searchFilters: map.has("searchFilters")
        ? (map.get("searchFilters") as AppSettings["searchFilters"])
        : DEFAULT_APP_SETTINGS.searchFilters,
    };
  }
}
