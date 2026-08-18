"use client";

import type { ReactNode } from "react";
import { useParams } from "next/navigation";

import { UpgradeSummaryBar } from "@/components/changes/upgrade-summary-bar";
import { useDeckChanges } from "@/lib/hooks/use-deck-changes";

type DeckLayoutClientProps = {
  children: ReactNode;
};

export function DeckLayoutClient({ children }: DeckLayoutClientProps) {
  const params = useParams();
  const deckId = typeof params.deckId === "string" ? params.deckId : undefined;
  const { summary } = useDeckChanges(deckId);

  return (
    <div className="flex flex-col gap-4 pb-[env(safe-area-inset-bottom)]">
      {children}
      {deckId ? <UpgradeSummaryBar deckId={deckId} summary={summary} /> : null}
    </div>
  );
}
