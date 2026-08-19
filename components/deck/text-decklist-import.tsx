"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { importTextDecklist } from "@/lib/import-export/import-deck";

export type TextDecklistImportProps = {
  /** When set, cards are added to this deck instead of creating a new one. */
  targetDeckId?: string;
  defaultName?: string;
  onImported?: (deckId: string) => void;
};

export function TextDecklistImport({
  targetDeckId,
  defaultName,
  onImported,
}: TextDecklistImportProps) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  async function handleImport() {
    if (!text.trim()) {
      toast.error("Paste a decklist first");
      return;
    }
    setPending(true);
    setProgress(null);
    try {
      const result = await importTextDecklist(text, {
        ...(targetDeckId ? { targetDeckId } : {}),
        ...(defaultName ? { deckName: defaultName } : {}),
        onProgress: (p) =>
          setProgress(`Resolving cards ${p.resolved + p.failed}/${p.total}…`),
      });
      const msg =
        result.unresolved.length > 0
          ? `Imported ${result.added} cards. ${result.unresolved.length} not found.`
          : `Imported ${result.added} cards.`;
      toast.success(msg);
      onImported?.(result.deckId!);
      if (result.deckId && !targetDeckId) {
        router.push(`/decks/${result.deckId}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setPending(false);
      setProgress(null);
    }
  }

  return (
    <div
      className="border-border bg-card flex flex-col gap-3 rounded-md border p-4 shadow-sm"
      data-testid="text-decklist-import"
    >
      <h2 className="font-mono text-xs uppercase">Paste decklist</h2>
      <p className="text-muted-foreground text-sm">
        Arena / MTGO / Moxfield-style lists. Lines like{" "}
        <code className="font-mono text-xs">1 Sol Ring</code> or{" "}
        <code className="font-mono text-xs">1x Card Name (SET)</code>.
      </p>
      <textarea
        data-testid="decklist-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        disabled={pending}
        placeholder={`// My Deck\n1 Sol Ring\n1 Arcane Signet`}
        className="border-border bg-background w-full rounded-md border p-3 font-mono text-sm shadow-sm"
      />
      {progress ? (
        <p className="font-mono text-xs uppercase">{progress}</p>
      ) : null}
      <Button
        type="button"
        data-testid="decklist-import-btn"
        disabled={pending || !text.trim()}
        onClick={() => void handleImport()}
      >
        {pending ? "Importing…" : "Import decklist"}
      </Button>
    </div>
  );
}
