// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OfflineIndicator } from "@/components/pwa/offline-indicator";

const onlineState = vi.hoisted(() => ({ value: true }));

vi.mock("@/lib/hooks/use-online-status", () => ({
  useOnlineStatus: () => onlineState.value,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    message: vi.fn(),
  },
}));

describe("OfflineIndicator", () => {
  afterEach(() => {
    cleanup();
    onlineState.value = true;
  });

  it("renders nothing while online", () => {
    onlineState.value = true;
    const { container } = render(createElement(OfflineIndicator));
    expect(container.firstChild).toBeNull();
  });

  it("shows offline banner when offline", () => {
    onlineState.value = false;
    render(createElement(OfflineIndicator));
    expect(screen.getByTestId("offline-indicator")).toBeTruthy();
    expect(screen.getByText(/You're offline/i)).toBeTruthy();
    expect(screen.getByText(/saved decks still available/i)).toBeTruthy();
  });
});
