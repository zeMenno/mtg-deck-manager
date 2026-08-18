"use client";

import { useMemo } from "react";

import { ChangeEmptyState } from "@/components/changes/change-empty-state";
import { ProjectedDeckHeader } from "@/components/changes/projected-deck-header";
import { DeckCardRow } from "@/components/deck/deck-card-row";
import { DeckWarningList } from "@/components/deck/deck-warning-list";
import { ProjectedValidationBanner } from "@/components/deck/projected-validation-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProjectedDeck } from "@/lib/hooks/use-projected-deck";
import { useDeckWarnings } from "@/lib/hooks/use-deck-warnings";
import { useDisplayPreferences } from "@/lib/hooks/use-display-preferences";
import type { DeckCardZone } from "@/types";

const ZONE_ORDER: DeckCardZone[] = [
  "commander",
  "mainboard",
  "sideboard",
  "maybeboard",
];

type ProjectedDeckViewProps = {
  deckId: string;
};

export function ProjectedDeckView({ deckId }: ProjectedDeckViewProps) {
  const { rows, counts, validation, changesOnly, setChangesOnly, isLoading } =
    useProjectedDeck(deckId);
  const { warnings } = useDeckWarnings(deckId, "projected");
  const { imagesEnabled, effectiveDensity } = useDisplayPreferences();

  const grouped = useMemo(() => {
    const map = new Map<DeckCardZone, typeof rows>();
    for (const zone of ZONE_ORDER) map.set(zone, []);
    for (const row of rows) {
      const list = map.get(row.zone) ?? [];
      list.push(row);
      map.set(row.zone, list);
    }
    return map;
  }, [rows]);

  if (isLoading) {
    return <p className="font-mono text-sm uppercase">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-4" data-testid="projected-deck-view">
      <ProjectedDeckHeader
        counts={counts}
        target={validation?.projectedTarget ?? 100}
      />

      <ProjectedValidationBanner
        deckId={deckId}
        warnings={warnings}
        projectedTotal={validation?.projectedTotal ?? counts.projectedQuantity}
        projectedTarget={validation?.projectedTarget ?? 100}
        addQuantity={counts.addQuantity}
        cutQuantity={counts.cutQuantity}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={changesOnly ? "outline" : "default"}
          data-testid="projected-show-all"
          onClick={() => setChangesOnly(false)}
        >
          Full list
        </Button>
        <Button
          type="button"
          size="sm"
          variant={changesOnly ? "default" : "outline"}
          data-testid="projected-show-changes"
          onClick={() => setChangesOnly(true)}
        >
          Changes only
        </Button>
      </div>

      {validation?.issues.length ? (
        <ul className="flex flex-col gap-1" data-testid="projected-validation">
          {validation.issues.map((issue) => (
            <li
              key={issue.id}
              className={
                issue.severity === "error"
                  ? "text-destructive text-sm font-bold"
                  : "text-sm text-amber-700 dark:text-amber-400"
              }
            >
              {issue.severity === "error" ? "⚠ " : ""}
              {issue.message}
            </li>
          ))}
        </ul>
      ) : null}

      <DeckWarningList
        warnings={warnings}
        limit={5}
        deckId={deckId}
        title="Projected deck check"
      />

      {rows.length === 0 ? (
        <ChangeEmptyState
          title={
            changesOnly ? "No incoming ADD cards." : "Projected deck is empty."
          }
        />
      ) : (
        ZONE_ORDER.map((zone) => {
          const zoneRows = grouped.get(zone) ?? [];
          if (zoneRows.length === 0) return null;
          return (
            <section key={zone} className="flex flex-col gap-2">
              <h3 className="font-mono text-xs uppercase">{zone}</h3>
              <ul className="flex flex-col gap-2">
                {zoneRows.map((row) => (
                  <li
                    key={row.id}
                    className="relative"
                    data-testid={`projected-row-${row.id}`}
                  >
                    <div className="absolute top-2 right-2 z-10">
                      <Badge
                        variant="outline"
                        className={
                          row.kind === "incoming"
                            ? "bg-status-add text-status-add-foreground border-2"
                            : "border-2"
                        }
                        data-testid={`projected-badge-${row.kind}`}
                      >
                        {row.kind === "incoming" ? "NEW" : "STAYING"}
                      </Badge>
                    </div>
                    <DeckCardRow
                      item={row}
                      density={effectiveDensity}
                      imagesEnabled={imagesEnabled}
                      showPrice
                    />
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
