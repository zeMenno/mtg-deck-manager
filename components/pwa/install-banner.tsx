"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Smartphone, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useIsStandalone } from "@/lib/pwa/use-is-standalone";

const DISMISSED_KEY = "mtg-deck-builder.install-banner-dismissed";

/**
 * Dismissal lives in localStorage until Phase 3 introduces the Dexie settings
 * table. Storage access throws in some private-browsing modes, so every access
 * is guarded — a banner that reappears is better than a page that crashes.
 */
function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

function writeDismissed(): void {
  try {
    window.localStorage.setItem(DISMISSED_KEY, "true");
  } catch {
    // Ignored: dismissal is a convenience, not state the app depends on.
  }
}

/**
 * Warns that Safari and the installed app do not share storage, so decks built
 * before installing will not follow the user to the Home Screen app (ADR-001).
 * Hidden once installed or dismissed.
 */
export function InstallBanner() {
  const standalone = useIsStandalone();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(readDismissed());
  }, []);

  if (standalone || dismissed) {
    return null;
  }

  return (
    <aside
      data-testid="install-banner"
      aria-labelledby="install-banner-title"
      className="border-border bg-warning text-warning-foreground shadow-brutal flex flex-col gap-3 border-4 p-4"
    >
      <div className="flex items-start gap-3">
        <Smartphone aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <div className="flex flex-col gap-1">
          <h2
            id="install-banner-title"
            className="text-sm font-black tracking-tight uppercase"
          >
            Install before you build
          </h2>
          <p className="text-sm">
            Add Deck Builder to your Home Screen before you start building
            decks. Safari and the installed app use separate storage, so decks
            made here will not appear there.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Dismiss install reminder"
          data-testid="install-banner-dismiss"
          className="ml-auto shrink-0"
          onClick={() => {
            writeDismissed();
            setDismissed(true);
          }}
        >
          <X aria-hidden="true" />
        </Button>
      </div>

      <Button asChild variant="outline" className="self-start">
        <Link href="/settings/install" data-testid="install-guide-link">
          How to install
        </Link>
      </Button>
    </aside>
  );
}
