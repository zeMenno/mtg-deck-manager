"use client";

import { useEffect, useRef } from "react";
import { WifiOff } from "lucide-react";
import { toast } from "sonner";

import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { cn } from "@/lib/utils";

type OfflineIndicatorProps = {
  className?: string;
};

/**
 * Global offline banner. Persistent while offline; "Back online" toast on reconnect.
 * Mounted in the app header — do not duplicate per-screen.
 */
export function OfflineIndicator({ className }: OfflineIndicatorProps) {
  const online = useOnlineStatus();
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      return;
    }
    if (wasOffline.current) {
      wasOffline.current = false;
      toast.success("Back online", { duration: 3000 });
    }
  }, [online]);

  if (online) {
    return null;
  }

  return (
    <div
      role="status"
      data-testid="offline-indicator"
      className={cn(
        "border-border bg-status-consider text-status-consider-foreground flex items-center justify-center gap-2 border-t px-4 py-2 text-xs font-semibold",
        className,
      )}
    >
      <WifiOff aria-hidden="true" className="size-4 shrink-0" />
      <span className="uppercase">You&apos;re offline</span>
      <span className="font-normal normal-case">
        — saved decks still available
      </span>
    </div>
  );
}
