"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type DeckTabsProps = {
  deckId: string;
};

const TABS = [
  { segment: "", label: "Overview", enabled: true },
  { segment: "cards", label: "Cards", enabled: true },
  { segment: "changes", label: "Changes", enabled: true },
  { segment: "stats", label: "Stats", enabled: true },
] as const;

export function DeckTabs({ deckId }: DeckTabsProps) {
  const pathname = usePathname();
  const base = `/decks/${deckId}`;

  return (
    <nav
      aria-label="Deck sections"
      className="border-border flex gap-1 overflow-x-auto border-b"
      data-testid="deck-tabs"
    >
      {TABS.map((tab) => {
        const href = tab.segment ? `${base}/${tab.segment}` : base;
        const active =
          tab.segment === ""
            ? pathname === base
            : pathname.startsWith(`${base}/${tab.segment}`);

        if (!tab.enabled) {
          return (
            <span
              key={tab.label}
              title="Coming soon"
              className="text-muted-foreground cursor-not-allowed px-3 py-2 text-xs font-bold uppercase opacity-50"
              data-testid={`deck-tab-${tab.label.toLowerCase()}-disabled`}
            >
              {tab.label}
            </span>
          );
        }

        return (
          <Link
            key={tab.label}
            href={href}
            data-testid={`deck-tab-${tab.label.toLowerCase()}`}
            className={cn(
              "px-3 py-2 text-xs font-bold uppercase",
              active ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
