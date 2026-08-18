"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Phase 2 stub: a plain online/offline bar. Phase 14 owns the polished version
 * (transitions, retry affordance, per-screen degraded states).
 */
export function OfflineIndicator() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => {
      setOffline(!navigator.onLine);
    };

    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);

    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) {
    return null;
  }

  return (
    <div
      role="status"
      data-testid="offline-indicator"
      className="border-border bg-foreground text-background flex items-center justify-center gap-2 border-t-4 px-4 py-2 text-xs font-bold uppercase"
    >
      <WifiOff aria-hidden="true" className="size-4" />
      <span>Offline — saved decks are still available</span>
    </div>
  );
}
