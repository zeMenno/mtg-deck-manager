/**
 * Public-API smoke imports for Knip (Phase 15).
 * These symbols are part of the intentional library surface used by hooks,
 * services, or future callers — keep them imported so CI knip stays green.
 */
import { describe, expect, it } from "vitest";

import { getCommanderColorIdentity } from "@/lib/deck-rules/color-identity";
import { DEFAULT_THRESHOLDS } from "@/lib/deck-rules/thresholds";
import { canApply } from "@/lib/deck/changes/change-summary";
import { getDeckCardService } from "@/lib/deck/deck-card-service";
import { ensureCardCached } from "@/lib/deck/deck-queries";
import { isMaybeboard } from "@/lib/deck/stats/filters";
import { resolveCards } from "@/lib/format/validators/helpers";
import { AppBackupDataSchema } from "@/lib/import-export/backup-schema";
import {
  USER_TABLES,
  isAppBackupShape,
} from "@/lib/import-export/import-full-backup";
import { SCRYFALL_BASE } from "@/lib/scryfall/endpoints";
import { DeckValidationService } from "@/lib/services/deck-validation-service";
import {
  RecommendationConfigService,
  normalizeRecommendationConfig,
} from "@/lib/services/recommendation-config-service";
import { settingsService } from "@/lib/settings/settings-service";

describe("public API surface (knip anchors)", () => {
  it("exposes format / deck helpers", () => {
    expect(DEFAULT_THRESHOLDS.minLands).toBeTypeOf("number");
    expect(canApply([])).toBe(false);
    expect(isMaybeboard({ zone: "maybeboard" } as never)).toBe(true);
    expect(resolveCards([], () => undefined)).toEqual([]);
    expect(getDeckCardService()).toBeTruthy();
    expect(typeof ensureCardCached).toBe("function");
    expect(
      getCommanderColorIdentity({
        colorIdentity: ["W", "U"],
      } as never),
    ).toEqual(["U", "W"]);
  });

  it("exposes backup / settings / validation services", () => {
    expect(AppBackupDataSchema).toBeTruthy();
    expect(USER_TABLES.length).toBeGreaterThan(0);
    expect(isAppBackupShape(null)).toBe(false);
    expect(SCRYFALL_BASE).toMatch(/^https:\/\//);
    expect(new DeckValidationService()).toBeInstanceOf(DeckValidationService);
    expect(new RecommendationConfigService()).toBeInstanceOf(
      RecommendationConfigService,
    );
    expect(normalizeRecommendationConfig({})).toBeTruthy();
    expect(settingsService).toBeTruthy();
  });
});
