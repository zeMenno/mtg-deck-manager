// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ThemePicker } from "@/components/settings/theme-picker";

const themeState = vi.hoisted(() => ({
  resolvedTheme: "dark",
  setTheme: vi.fn(),
}));

vi.mock("next-themes", () => ({
  useTheme: () => themeState,
}));

describe("ThemePicker", () => {
  it("renders an unselected disabled control before mounting", () => {
    const html = renderToString(<ThemePicker />);

    expect(html).toContain('data-testid="theme-dark"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain("disabled");
  });

  it("shows the resolved theme and selects light", () => {
    themeState.resolvedTheme = "dark";
    themeState.setTheme.mockClear();
    render(<ThemePicker />);

    expect(screen.getByTestId("theme-dark").getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByTestId("theme-light").getAttribute("aria-pressed")).toBe(
      "false",
    );

    fireEvent.click(screen.getByTestId("theme-light"));
    expect(themeState.setTheme).toHaveBeenCalledWith("light");
  });
});
