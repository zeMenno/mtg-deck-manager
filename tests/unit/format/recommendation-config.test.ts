import { beforeEach, describe, expect, it } from "vitest";

import { resetDatabase } from "@/tests/helpers/db-test-utils";
import { recommendationConfigService } from "@/lib/services/recommendation-config-service";
import { DEFAULT_RECOMMENDATION_CONFIG } from "@/types/deck-validation";

describe("recommendation-config-service", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("returns defaults initially", async () => {
    const config = await recommendationConfigService.get();
    expect(config.minLands).toBe(DEFAULT_RECOMMENDATION_CONFIG.minLands);
    expect(config.minRemoval).toBe(DEFAULT_RECOMMENDATION_CONFIG.minRemoval);
  });

  it("updates and persists thresholds", async () => {
    const next = await recommendationConfigService.update({ minLands: 30 });
    expect(next.minLands).toBe(30);
    const reloaded = await recommendationConfigService.get();
    expect(reloaded.minLands).toBe(30);
  });

  it("resets to defaults", async () => {
    await recommendationConfigService.update({ minRamp: 12 });
    const reset = await recommendationConfigService.reset();
    expect(reset.minRamp).toBe(DEFAULT_RECOMMENDATION_CONFIG.minRamp);
  });
});
