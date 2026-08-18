import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = {
  title: "Offline",
  description: "This screen has not been cached for offline use yet.",
};

/**
 * Service worker fallback for document requests that miss the cache (see
 * app/sw.ts). Must stay static and dependency-free so it is always precachable.
 */
export default function OfflinePage() {
  return (
    <EmptyState
      icon={WifiOff}
      title="You're offline"
      description="Your saved decks are still available. This screen hasn't been cached yet, so open it again once you have a connection. Card search is limited to cached cards."
    />
  );
}
