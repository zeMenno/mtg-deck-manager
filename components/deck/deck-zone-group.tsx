"use client";

import type { ReactNode } from "react";

type DeckZoneGroupProps = {
  title: string;
  count: number;
  children: ReactNode;
};

export function DeckZoneGroup({ title, count, children }: DeckZoneGroupProps) {
  return (
    <section
      className="flex flex-col gap-2"
      data-testid={`zone-${title.toLowerCase()}`}
    >
      <h2 className="font-mono text-xs font-bold uppercase">
        {title} <span className="text-muted-foreground">({count})</span>
      </h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}
