"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { DeckFormatSelect } from "@/components/deck/deck-format-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_FORMAT } from "@/lib/deck/constants";
import { useCreateDeck } from "@/lib/hooks/use-deck-mutations";
import type { DeckFormat } from "@/types";

type DeckCreateFormProps = {
  onCreated?: (deckId: string) => void;
  showSkipCommander?: boolean;
};

export function DeckCreateForm({
  onCreated,
  showSkipCommander = true,
}: DeckCreateFormProps) {
  const router = useRouter();
  const createDeck = useCreateDeck();
  const [name, setName] = useState("");
  const [format, setFormat] = useState<DeckFormat>(DEFAULT_FORMAT);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent, goToCommander: boolean) {
    event.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a deck name");
      return;
    }

    try {
      const deck = await createDeck.mutateAsync({
        name: trimmed,
        format,
        ...(description.trim() ? { description: description.trim() } : {}),
      });
      toast.success(`Created ${deck.name}`);
      onCreated?.(deck.id);
      if (goToCommander) {
        router.push(`/decks/${deck.id}?pickCommander=1`);
      } else {
        router.push(`/decks/${deck.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create deck");
    }
  }

  return (
    <form
      className="border-border bg-card shadow-brutal flex flex-col gap-4 border-4 p-4"
      onSubmit={(e) => void handleSubmit(e, showSkipCommander)}
      data-testid="deck-create-form"
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="deck-name" className="font-mono text-xs uppercase">
          Name
        </label>
        <Input
          id="deck-name"
          data-testid="deck-name-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Soldier Swarm"
          disabled={createDeck.isPending}
          autoFocus
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="deck-format" className="font-mono text-xs uppercase">
          Format
        </label>
        <DeckFormatSelect
          value={format}
          onChange={setFormat}
          disabled={createDeck.isPending}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="deck-description"
          className="font-mono text-xs uppercase"
        >
          Description (optional)
        </label>
        <textarea
          id="deck-description"
          data-testid="deck-description-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={createDeck.isPending}
          rows={3}
          className="border-border bg-background shadow-brutal-sm w-full border-2 p-3 text-sm"
        />
      </div>

      {error ? (
        <p className="text-destructive font-mono text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <Button
          type="submit"
          data-testid="deck-save-btn"
          disabled={createDeck.isPending}
        >
          {createDeck.isPending ? "Creating…" : "Create deck"}
        </Button>
        {showSkipCommander ? (
          <Button
            type="button"
            variant="outline"
            disabled={createDeck.isPending}
            data-testid="deck-save-skip-commander-btn"
            onClick={(e) => void handleSubmit(e, false)}
          >
            Create & skip commander
          </Button>
        ) : null}
      </div>
    </form>
  );
}
