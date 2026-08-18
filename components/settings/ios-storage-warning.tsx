"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { useIsStandalone } from "@/lib/pwa/use-is-standalone";

/**
 * Persistent iOS storage isolation warning for Settings → Data.
 */
export function IosStorageWarning() {
  const standalone = useIsStandalone();

  return (
    <aside
      className="border-border bg-warning text-warning-foreground shadow-brutal flex flex-col gap-2 border-4 p-4"
      data-testid="ios-storage-warning"
      role="note"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-black uppercase">iPhone Storage Note</p>
          <p className="text-sm">
            If you use Safari and also install this app to your Home Screen,
            they store data separately. Build decks in one place, or export
            before switching.
          </p>
          <p className="text-sm">
            Install to Home Screen before importing large collections.
            {standalone ? " You are currently in the installed app." : null}
          </p>
          <Link
            href="/settings/install"
            className="mt-1 text-sm font-bold underline underline-offset-2"
            data-testid="ios-storage-install-link"
          >
            Install help
          </Link>
        </div>
      </div>
    </aside>
  );
}
