"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useServiceWorker } from "@/lib/pwa/use-service-worker";

/**
 * Registers the service worker and offers a reload when a newer version has
 * been installed. Mounted once, in the app shell.
 */
export function UpdatePrompt() {
  const { updateReady, applyUpdate } = useServiceWorker();

  if (!updateReady) {
    return null;
  }

  return (
    <div
      role="status"
      data-testid="update-prompt"
      className="bottom-above-nav border-border bg-primary text-primary-foreground shadow-brutal fixed inset-x-2 z-50 flex items-center gap-3 border-4 p-3"
    >
      <RefreshCw aria-hidden="true" className="size-5 shrink-0" />
      <p className="text-sm font-bold uppercase">New version available</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        data-testid="update-prompt-reload"
        className="ml-auto"
        onClick={applyUpdate}
      >
        Reload
      </Button>
    </div>
  );
}
