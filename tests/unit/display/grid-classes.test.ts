import { describe, expect, it } from "vitest";

import {
  GRID_VIRTUALIZE_THRESHOLD,
  IMAGE_MODE_VIRTUALIZE_THRESHOLD,
} from "@/lib/display/constants";
import {
  estimateTileHeight,
  GRID_COLUMNS_CLASS,
  getTileMetaClass,
} from "@/lib/display/grid-classes";

describe("grid classes", () => {
  it("exports responsive column utilities", () => {
    expect(GRID_COLUMNS_CLASS).toContain("grid-cols-2");
    expect(GRID_COLUMNS_CLASS).toContain("sm:grid-cols-3");
    expect(GRID_COLUMNS_CLASS).toContain("md:grid-cols-4");
    expect(GRID_COLUMNS_CLASS).toContain("lg:grid-cols-5");
    expect(GRID_COLUMNS_CLASS).toContain("xl:grid-cols-6");
    expect(getTileMetaClass()).toContain("min-h-11");
  });

  it("estimates tile height from column width and card aspect", () => {
    const height = estimateTileHeight(160);
    expect(height).toBeGreaterThan(160 * (680 / 488));
    expect(height).toBe(Math.round(160 * (680 / 488) + 88));
  });

  it("keeps grid virtualization above image-mode flattening", () => {
    expect(GRID_VIRTUALIZE_THRESHOLD).toBeGreaterThan(
      IMAGE_MODE_VIRTUALIZE_THRESHOLD,
    );
  });
});
