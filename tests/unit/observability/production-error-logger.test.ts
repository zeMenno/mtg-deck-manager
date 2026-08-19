import { afterEach, describe, expect, it, vi } from "vitest";

import { installProductionErrorLogger } from "@/lib/observability/production-error-logger";

describe("installProductionErrorLogger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // Allow reinstall in subsequent tests
    delete (window as Window & { __deckBuilderErrorLoggerInstalled?: boolean })
      .__deckBuilderErrorLoggerInstalled;
  });

  it("registers once and logs uncaught errors without throwing", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const addSpy = vi.spyOn(window, "addEventListener");

    installProductionErrorLogger();
    installProductionErrorLogger();

    expect(addSpy).toHaveBeenCalledWith("error", expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith(
      "unhandledrejection",
      expect.any(Function),
    );
    // Second install must not add more listeners
    const errorListenerCalls = addSpy.mock.calls.filter(
      (c) => c[0] === "error",
    );
    expect(errorListenerCalls).toHaveLength(1);

    const handler = errorListenerCalls[0]?.[1] as EventListener;
    handler(
      new ErrorEvent("error", {
        message: "boom",
        error: new Error("boom"),
      }),
    );
    expect(errorSpy).toHaveBeenCalled();
    const payload = errorSpy.mock.calls[0]?.[2] as { message?: string };
    expect(payload?.message).toBe("boom");
  });
});
