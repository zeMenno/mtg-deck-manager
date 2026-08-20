"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSuggestTags } from "@/lib/hooks/use-suggest-tags";
import { useTags } from "@/lib/hooks/use-tags";
import type {
  DeckTagSuggestionPreview,
  SuggestionApplyPolicy,
} from "@/lib/tags/apply-suggestions";

type SuggestTagsSheetProps = {
  deckId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const POLICIES: Array<{ value: SuggestionApplyPolicy; label: string }> = [
  { value: "untagged", label: "Only fully untagged cards" },
  { value: "fill-empty", label: "Fill empty role or synergy groups" },
  { value: "replace", label: "Replace existing tags" },
];

export function SuggestTagsSheet({
  deckId,
  open,
  onOpenChange,
}: SuggestTagsSheetProps) {
  const suggestions = useSuggestTags(deckId);
  const { tags } = useTags();
  const [policy, setPolicy] = useState<SuggestionApplyPolicy>("untagged");
  const [plan, setPlan] = useState<DeckTagSuggestionPreview | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmReplace, setConfirmReplace] = useState(false);

  const tagNames = useMemo(
    () => new Map(tags.map((tag) => [tag.id, tag.name])),
    [tags],
  );

  useEffect(() => {
    if (open) return;
    setPolicy("untagged");
    setPlan(null);
    setSelected([]);
    setConfirmReplace(false);
  }, [open]);

  async function buildPreview(nextPolicy = policy) {
    try {
      const next = await suggestions.preview.mutateAsync(nextPolicy);
      setPlan(next);
      setSelected(next.rows.map((row) => row.deckCardId));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not suggest tags",
      );
    }
  }

  async function apply() {
    if (!plan) return;
    try {
      const count = await suggestions.apply.mutateAsync({
        plan,
        selectedDeckCardIds: selected,
      });
      toast.success(
        `Applied suggestions to ${count} card${count === 1 ? "" : "s"}`,
      );
      onOpenChange(false);
    } catch {
      toast.error("Could not apply tag suggestions");
    }
  }

  const busy = suggestions.preview.isPending || suggestions.apply.isPending;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          snap="tall"
          className="overflow-y-auto"
          data-testid="suggest-tags-sheet"
        >
          <SheetHeader>
            <SheetTitle>Suggest tags</SheetTitle>
            <SheetDescription>
              Local rules inspect cached type lines, keywords, and oracle text.
              They are not Archidekt crowd categories, EDHREC scores, or AI.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-4 px-4 pb-8">
            <fieldset className="flex flex-col gap-2">
              <legend className="font-mono text-xs uppercase">
                Apply policy
              </legend>
              {POLICIES.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={policy === option.value ? "default" : "outline"}
                  className="justify-start whitespace-normal"
                  disabled={busy}
                  data-testid={`suggest-policy-${option.value}`}
                  onClick={() => {
                    setPolicy(option.value);
                    setPlan(null);
                    setSelected([]);
                  }}
                >
                  {option.label}
                </Button>
              ))}
            </fieldset>

            <Button
              type="button"
              disabled={busy}
              data-testid="suggest-tags-preview-btn"
              onClick={() => void buildPreview()}
            >
              {suggestions.preview.isPending
                ? "Checking cached cards…"
                : "Preview suggestions"}
            </Button>

            {plan ? (
              <div
                className="flex flex-col gap-3"
                data-testid="suggest-preview"
              >
                <p className="text-muted-foreground text-sm">
                  {plan.rows.length} cards with suggestions ·{" "}
                  {plan.skippedTagged} tagged cards skipped ·{" "}
                  {plan.noSuggestions} deliberate misses
                </p>

                {plan.rows.map((row) => {
                  const checked = selected.includes(row.deckCardId);
                  return (
                    <label
                      key={row.deckCardId}
                      className="border-border bg-card flex min-h-11 gap-3 rounded-md border p-3 shadow-sm"
                    >
                      <input
                        type="checkbox"
                        className="mt-1 size-4 shrink-0"
                        checked={checked}
                        data-testid={`suggest-row-${row.deckCardId}`}
                        onChange={() =>
                          setSelected((current) =>
                            checked
                              ? current.filter((id) => id !== row.deckCardId)
                              : [...current, row.deckCardId],
                          )
                        }
                      />
                      <span className="min-w-0">
                        <span className="block font-bold">{row.cardName}</span>
                        <span className="text-muted-foreground block text-xs">
                          {[...row.suggestedRoles, ...row.suggestedSynergies]
                            .map((id) => tagNames.get(id) ?? id)
                            .join(", ")}
                        </span>
                        <span className="text-muted-foreground block text-xs">
                          {row.reasons
                            .map((reason) => reason.reason)
                            .join(" · ")}
                        </span>
                      </span>
                    </label>
                  );
                })}

                {plan.rows.length === 0 ? (
                  <p className="border-border text-muted-foreground rounded-md border p-4 text-sm">
                    No applicable suggestions for this policy.
                  </p>
                ) : null}

                <Button
                  type="button"
                  disabled={busy || selected.length === 0}
                  data-testid="suggest-tags-apply-btn"
                  onClick={() => {
                    if (policy === "replace") setConfirmReplace(true);
                    else void apply();
                  }}
                >
                  Apply to {selected.length} selected
                </Button>
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmReplace}
        onOpenChange={setConfirmReplace}
        title="Replace existing tags?"
        description="This removes existing role, synergy, and custom tags from selected cards before applying the suggestions."
        confirmLabel="Replace tags"
        destructive
        pending={suggestions.apply.isPending}
        testId="suggest-replace-confirm"
        onConfirm={apply}
      />
    </>
  );
}
