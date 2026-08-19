// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UndoSnackbar } from "@/components/shared/undo-snackbar";
import type { UndoAction } from "@/components/shared/undo-provider";

describe("UndoSnackbar", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders nothing without an action", () => {
    const { container } = render(
      createElement(UndoSnackbar, {
        action: null,
        onUndo: () => undefined,
        onDismiss: () => undefined,
        onPause: () => undefined,
        onResume: () => undefined,
      }),
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows message and UNDO control", () => {
    const action: UndoAction = {
      id: "1",
      message: "Removed Lightning Bolt",
      undo: async () => undefined,
    };
    const onUndo = vi.fn();
    const onDismiss = vi.fn();

    render(
      createElement(UndoSnackbar, {
        action,
        onUndo,
        onDismiss,
        onPause: () => undefined,
        onResume: () => undefined,
      }),
    );

    expect(screen.getByTestId("undo-snackbar")).toBeTruthy();
    expect(screen.getByText("Removed Lightning Bolt")).toBeTruthy();
    fireEvent.click(screen.getByTestId("undo-snackbar-btn"));
    expect(onUndo).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId("undo-snackbar-dismiss"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
