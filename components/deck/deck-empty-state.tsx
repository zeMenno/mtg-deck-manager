"use client";

import Link from "next/link";
import { Layers } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

type DeckEmptyStateProps = {
  onCreateClick?: () => void;
};

export function DeckEmptyState({ onCreateClick }: DeckEmptyStateProps) {
  return (
    <EmptyState
      icon={Layers}
      title="No decks yet"
      description="Create a Commander deck to start building. Data stays on this device."
      action={
        onCreateClick ? (
          <Button
            type="button"
            data-testid="deck-create-btn"
            onClick={onCreateClick}
          >
            Create your first deck
          </Button>
        ) : (
          <Button asChild data-testid="deck-create-btn">
            <Link href="/decks/new">Create your first deck</Link>
          </Button>
        )
      }
    />
  );
}
