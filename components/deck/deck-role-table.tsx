"use client";

import { cn } from "@/lib/utils";
import type { DistributionItem } from "@/lib/deck/stats";

type DeckRoleTableProps = {
  items: DistributionItem[];
  title?: string;
  emptyMessage?: string;
  className?: string;
  testId?: string;
};

export function DeckRoleTable({
  items,
  title = "Roles",
  emptyMessage = "No roles assigned yet. Tag cards to track coverage.",
  className,
  testId = "deck-role-table",
}: DeckRoleTableProps) {
  return (
    <div data-testid={testId} className={cn("flex flex-col gap-2", className)}>
      <h3 className="font-mono text-xs font-bold uppercase">{title}</h3>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{emptyMessage}</p>
      ) : (
        <table className="border-border w-full border-2 text-left text-sm">
          <thead className="bg-muted font-mono text-xs uppercase">
            <tr>
              <th className="border-border border-b-2 px-3 py-2">Name</th>
              <th className="border-border border-b-2 px-3 py-2 text-right">
                Count
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-border border-b last:border-b-0"
              >
                <td className="px-3 py-2 font-bold">{item.label}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {item.count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function DeckSynergyTable({
  items,
  className,
}: {
  items: DistributionItem[];
  className?: string;
}) {
  return (
    <DeckRoleTable
      items={items}
      title="Synergies"
      emptyMessage="No synergies tagged yet."
      className={className}
      testId="deck-synergy-table"
    />
  );
}
