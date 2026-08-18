import type { DeckBuilderDatabase } from "@/lib/db/database";
import { getDatabase } from "@/lib/db/database";
import { SettingsRepository } from "@/lib/db/repositories";
import type { AppSettings, SettingKey } from "@/types/card";

export class SettingsService {
  constructor(
    private readonly database: DeckBuilderDatabase = getDatabase(),
    private readonly settings = new SettingsRepository(database),
  ) {}

  async get<K extends SettingKey>(key: K): Promise<AppSettings[K]> {
    return this.settings.get(key);
  }

  async set<K extends SettingKey>(
    key: K,
    value: AppSettings[K],
  ): Promise<void> {
    await this.settings.set(key, value);
  }

  async getAll(): Promise<AppSettings> {
    return this.settings.getTyped();
  }
}

export const settingsService = new SettingsService();
