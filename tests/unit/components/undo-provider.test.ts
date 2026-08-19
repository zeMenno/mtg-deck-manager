// @vitest-environment jsdom
import { createElement } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UndoProvider, useUndo } from "@/components/shared/undo-provider";

function Probe() {
  const { showUndo, current } = useUndo();
  return createElement(
    "div",
    null,
    createElement(
      "button",
      {
        type: "button",
        "data-testid": "trigger-undo",
        onClick: () =>
          showUndo({
            message: "Removed card",
            undo: async () => undefined,
          }),
      },
      "Trigger",
    ),
    createElement(
      "span",
      { "data-testid": "current-message" },
      current?.message ?? "none",
    ),
  );
}

describe("UndoProvider", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("queues a snackbar action and auto-dismisses", () => {
    vi.useFakeTimers();
    render(createElement(UndoProvider, null, createElement(Probe)));

    expect(screen.getByTestId("current-message").textContent).toBe("none");
    act(() => {
      screen.getByTestId("trigger-undo").click();
    });
    expect(screen.getByTestId("current-message").textContent).toBe(
      "Removed card",
    );
    expect(screen.getByTestId("undo-snackbar")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId("current-message").textContent).toBe("none");
  });
});
