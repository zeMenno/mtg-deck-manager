import { afterEach, describe, expect, it } from "vitest";

import type { DeckBuilderDatabase } from "@/lib/db/database";
import { getEffectiveDensity } from "@/lib/display/get-effective-density";
import { SettingsService } from "@/lib/settings/settings-service";
import { closeAndDelete, resetDatabase } from "@/tests/helpers/db-test-utils";
import { DEFAULT_APP_SETTINGS } from "@/types/card";

describe("settings persistence", () => {
  let database: DeckBuilderDatabase;

  afterEach(async () => {
    if (database) {
      await closeAndDelete(database);
    }
  });

  it("defaults images on and comfortable density", async () => {
    database = await resetDatabase();
    const settings = new SettingsService(database);
    const typed = await settings.getAll();
    expect(typed.imagesEnabled).toBe(DEFAULT_APP_SETTINGS.imagesEnabled);
    expect(typed.densityMode).toBe("comfortable");
    expect(typed.imagesEnabled).toBe(true);
  });

  it("persists image toggle and density mode", async () => {
    database = await resetDatabase();
    const settings = new SettingsService(database);

    await settings.set("imagesEnabled", false);
    await settings.set("densityMode", "image");

    const typed = await settings.getAll();
    expect(typed.imagesEnabled).toBe(false);
    expect(typed.densityMode).toBe("image");
    expect(typed.currency).toBe("USD");

    // Effective layout when images off is always compact.
    expect(
      getEffectiveDensity({
        imagesEnabled: typed.imagesEnabled,
        density: typed.densityMode,
      }),
    ).toBe("compact");
  });

  it("round-trips comfortable → image → compact preferences", async () => {
    database = await resetDatabase();
    const settings = new SettingsService(database);

    await settings.set("densityMode", "image");
    expect((await settings.getAll()).densityMode).toBe("image");

    await settings.set("densityMode", "compact");
    expect((await settings.getAll()).densityMode).toBe("compact");

    await settings.set("imagesEnabled", true);
    await settings.set("densityMode", "comfortable");
    const again = await settings.getAll();
    expect(again.imagesEnabled).toBe(true);
    expect(again.densityMode).toBe("comfortable");
  });
});
