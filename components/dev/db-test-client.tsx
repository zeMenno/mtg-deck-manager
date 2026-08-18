"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardRepository } from "@/lib/db/repositories";
import { deckCardService, deckService } from "@/lib/deck/deck-service";
import { useDeckCards } from "@/lib/hooks/use-deck-cards";
import { useDecks } from "@/lib/hooks/use-decks";
import type { DeckCardStatus } from "@/types";
import type { Card } from "@/types/card";

const STATUSES: DeckCardStatus[] = ["current", "add", "cut", "consider"];

const MOCK_CARD: Omit<Card, "updatedAt"> = {
  id: "00000000-0000-4000-8000-000000000001",
  oracleId: "00000000-0000-4000-8000-0000000000aa",
  name: "Sol Ring",
  manaCost: "{1}",
  manaValue: 1,
  typeLine: "Artifact",
  oracleText: "{T}: Add {C}{C}.",
  colors: [],
  colorIdentity: [],
  keywords: [],
};

/**
 * Dev-only CRUD smoke harness for Phase 3 persistence checks.
 * Gate behind NODE_ENV !== 'production' at the page level.
 */
export function DbTestClient() {
  const { decks } = useDecks(true);
  const [selectedDeckId, setSelectedDeckId] = useState<string | undefined>();
  const { cards: deckCards } = useDeckCards(selectedDeckId);
  const [name, setName] = useState("Test Deck");
  const [renameTo, setRenameTo] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  function pushLog(message: string) {
    setLog((prev) =>
      [`${new Date().toISOString().slice(11, 19)} ${message}`, ...prev].slice(
        0,
        20,
      ),
    );
  }

  function run(label: string, fn: () => Promise<void>) {
    startTransition(async () => {
      try {
        await fn();
        pushLog(`OK: ${label}`);
      } catch (err) {
        pushLog(
          `ERR: ${label} — ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-black uppercase">DB Test</h1>
      <p className="text-muted-foreground font-mono text-xs uppercase">
        Dev-only persistence smoke test
      </p>

      <section className="border-border shadow-brutal flex flex-col gap-3 border-4 p-4">
        <h2 className="font-bold uppercase">Deck CRUD</h2>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
        <Button
          disabled={pending}
          onClick={() =>
            run("create deck", async () => {
              const deck = await deckService.createDeck({
                name,
                format: "commander",
              });
              setSelectedDeckId(deck.id);
            })
          }
        >
          Create deck
        </Button>
        <Input
          value={renameTo}
          onChange={(e) => setRenameTo(e.target.value)}
          placeholder="New name"
        />
        <Button
          disabled={pending || !selectedDeckId}
          variant="secondary"
          onClick={() =>
            run("rename deck", async () => {
              if (!selectedDeckId) return;
              await deckService.renameDeck(selectedDeckId, renameTo);
            })
          }
        >
          Rename selected
        </Button>
        <Button
          disabled={pending || !selectedDeckId}
          variant="destructive"
          onClick={() =>
            run("delete deck", async () => {
              if (!selectedDeckId) return;
              await deckService.deleteDeck(selectedDeckId);
              setSelectedDeckId(undefined);
            })
          }
        >
          Delete selected
        </Button>
      </section>

      <section className="border-border shadow-brutal flex flex-col gap-3 border-4 p-4">
        <h2 className="font-bold uppercase">Cards</h2>
        <Button
          disabled={pending || !selectedDeckId}
          onClick={() =>
            run("add Sol Ring", async () => {
              if (!selectedDeckId) return;
              await new CardRepository().upsert(MOCK_CARD);
              await deckCardService.addCard({
                deckId: selectedDeckId,
                cardId: MOCK_CARD.id,
                zone: "mainboard",
                status: "current",
              });
            })
          }
        >
          Add mock Sol Ring
        </Button>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((status) => (
            <Button
              key={status}
              size="sm"
              variant="outline"
              disabled={pending || !deckCards[0]}
              onClick={() =>
                run(`status → ${status}`, async () => {
                  const first = deckCards[0];
                  if (!first) return;
                  await deckCardService.setStatus(first.id, status);
                })
              }
            >
              {status}
            </Button>
          ))}
        </div>
      </section>

      <section className="border-border shadow-brutal border-4 p-4">
        <h2 className="mb-2 font-bold uppercase">State</h2>
        <p className="font-mono text-xs">
          Selected: {selectedDeckId ?? "(none)"}
        </p>
        <ul className="mt-2 space-y-1 font-mono text-sm">
          {decks.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                className="underline"
                onClick={() => setSelectedDeckId(d.id)}
              >
                {d.name}
              </button>
            </li>
          ))}
        </ul>
        <ul className="mt-4 space-y-1 font-mono text-xs">
          {deckCards.map((c) => (
            <li key={c.id}>
              {c.cardId.slice(0, 8)}… · {c.status} · qty {c.quantity}
            </li>
          ))}
        </ul>
      </section>

      <section className="border-border shadow-brutal border-4 p-4 font-mono text-xs">
        <h2 className="mb-2 font-bold uppercase">Log</h2>
        <ul className="space-y-1">
          {log.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
