/**
 * Minimal production error logging (Phase 16).
 * No PII, no deck/card payloads — message + stack only.
 * See docs/decisions/error-tracking.md.
 */

const PREFIX = "[DeckBuilder]";

function summarizeUnknown(reason: unknown): string {
  if (reason instanceof Error) {
    return reason.message;
  }
  if (typeof reason === "string") {
    return reason.slice(0, 500);
  }
  return "non-error rejection";
}

/**
 * Install once on the client. Safe to call from React effects.
 * No-op outside the browser or when already installed.
 */
export function installProductionErrorLogger(): void {
  if (typeof window === "undefined") return;
  const flag = "__deckBuilderErrorLoggerInstalled" as const;
  const w = window as Window & { [flag]?: boolean };
  if (w[flag]) return;
  w[flag] = true;

  window.addEventListener("error", (event) => {
    const message = event.message || event.error?.message || "unknown error";
    const stack = event.error instanceof Error ? event.error.stack : undefined;
    console.error(PREFIX, "uncaught", { message, stack });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const message = summarizeUnknown(event.reason);
    const stack =
      event.reason instanceof Error ? event.reason.stack : undefined;
    console.error(PREFIX, "unhandledrejection", { message, stack });
  });
}
