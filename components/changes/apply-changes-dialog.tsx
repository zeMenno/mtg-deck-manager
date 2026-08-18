"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  ApplyChangesReview,
  buildApplyValidation,
} from "@/components/changes/apply-changes-review";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useApplyChanges } from "@/lib/hooks/use-apply-changes";
import { useDeck } from "@/lib/hooks/use-deck";
import { useDeckCards } from "@/lib/hooks/use-deck-cards";
import { useDeckValuation } from "@/lib/hooks/use-deck-valuation";
import { useMemo } from "react";

type ApplyChangesDialogProps = {
  deckId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ApplyChangesDialog({
  deckId,
  open,
  onOpenChange,
}: ApplyChangesDialogProps) {
  const router = useRouter();
  const { deck } = useDeck(deckId);
  const { cards } = useDeckCards(deckId);
  const { valuation } = useDeckValuation(deckId);
  const apply = useApplyChanges(deckId);

  const validation = useMemo(() => {
    if (!deck) {
      return {
        ok: false,
        canApply: false,
        issues: [],
        projectedTotal: 0,
        projectedTarget: 100,
      };
    }
    return buildApplyValidation(deck, cards);
  }, [deck, cards]);

  if (!deck) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="overflow-y-auto"
        data-testid="apply-changes-dialog"
      >
        <SheetHeader>
          <SheetTitle>Review changes</SheetTitle>
          <SheetDescription className="sr-only">
            Confirm applying ADD and CUT changes to this deck
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-8">
          <ApplyChangesReview
            deck={deck}
            cards={cards}
            validation={validation}
            pending={apply.isPending}
            upgradeCost={valuation?.upgradeCost}
            currency={valuation?.currency}
            onCancel={() => onOpenChange(false)}
            onConfirm={() => {
              void apply.mutateAsync({}).then((result) => {
                if (result.errors?.length) {
                  toast.error(result.errors[0]);
                  return;
                }
                onOpenChange(false);
                toast.success(
                  `Changes applied · +${result.promotedCount} added · −${result.removedCount} removed`,
                  {
                    action: {
                      label: "Save a version?",
                      onClick: () =>
                        router.push(`/decks/${deckId}?saveVersion=1`),
                    },
                  },
                );
                router.push(`/decks/${deckId}`);
              });
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
