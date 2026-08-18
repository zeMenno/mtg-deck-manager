"use client";

import { useEffect, useState } from "react";

/** The subset of `window` that standalone detection needs, so it can be tested. */
type DisplayModeWindow = {
  matchMedia?: (query: string) => { matches: boolean };
  navigator?: object;
};

/** `navigator.standalone` is a non-standard iOS Safari property. */
function isIosStandalone(nav: object | undefined): boolean {
  return nav !== undefined && "standalone" in nav && nav.standalone === true;
}

/**
 * True when the app is running as an installed web app rather than in a browser
 * tab. Older iOS versions do not report `display-mode: standalone`, so the
 * non-standard `navigator.standalone` is checked as well.
 */
export function isStandaloneDisplayMode(win: DisplayModeWindow): boolean {
  if (isIosStandalone(win.navigator)) {
    return true;
  }

  return win.matchMedia?.("(display-mode: standalone)").matches === true;
}

/**
 * Always false on the server and on the first client render, so markup matches
 * during hydration. Callers must treat "not standalone yet" as the safe default.
 */
export function useIsStandalone(): boolean {
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    setStandalone(isStandaloneDisplayMode(window));
  }, []);

  return standalone;
}
