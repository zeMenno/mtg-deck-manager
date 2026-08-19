"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Heart,
  Home,
  Layers,
  Search,
  Settings,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/decks", label: "Decks", icon: Layers },
  { href: "/cards", label: "Cards", icon: Search },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function extractDeckId(pathname: string): string | null {
  const match = pathname.match(/^\/decks\/([^/]+)/);
  if (!match) return null;
  const id = match[1];
  if (!id || id === "new") return null;
  return id;
}

const DECK_SUB_NAV = [
  { segment: "", label: "Overview" },
  { segment: "cards", label: "Cards" },
  { segment: "changes", label: "Changes" },
  { segment: "stats", label: "Stats" },
  { segment: "versions", label: "Versions" },
] as const;

/**
 * Persistent left sidebar for md+ breakpoints.
 * Shows deck sub-nav when inside `/decks/[deckId]/*`.
 */
export function SidebarNav() {
  const pathname = usePathname();
  const deckId = extractDeckId(pathname);

  return (
    <aside
      aria-label="Primary sidebar"
      data-testid="sidebar-nav"
      className="border-border bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r shadow-sm md:flex"
    >
      <div className="pt-safe border-border border-b px-4 py-4">
        <Link
          href="/"
          className="font-heading text-base font-black tracking-tight uppercase hover:underline"
          data-testid="sidebar-brand"
        >
          MTG Deck Builder
        </Link>
        <p className="font-mono text-[0.625rem] uppercase opacity-70">
          Local-first
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        <p className="font-mono text-[0.625rem] uppercase opacity-60">App</p>
        <ul className="flex flex-col gap-1">
          {PRIMARY_NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  data-testid={`sidebar-nav-${item.label.toLowerCase()}`}
                  className={cn(
                    "flex min-h-11 items-center gap-3 border px-3 text-sm font-bold uppercase transition-colors",
                    active
                      ? "border-border bg-primary text-primary-foreground"
                      : "hover:border-border hover:bg-muted border-transparent",
                  )}
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {deckId ? (
          <div className="mt-6 flex flex-col gap-1">
            <p className="font-mono text-[0.625rem] uppercase opacity-60">
              This deck
            </p>
            <ul className="flex flex-col gap-1" data-testid="sidebar-deck-nav">
              {DECK_SUB_NAV.map((tab) => {
                const href = tab.segment
                  ? `/decks/${deckId}/${tab.segment}`
                  : `/decks/${deckId}`;
                const active =
                  tab.segment === ""
                    ? pathname === `/decks/${deckId}`
                    : pathname.startsWith(`/decks/${deckId}/${tab.segment}`);
                return (
                  <li key={tab.label}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      data-testid={`sidebar-deck-${tab.label.toLowerCase()}`}
                      className={cn(
                        "flex min-h-10 items-center border px-3 text-xs font-bold uppercase transition-colors",
                        active
                          ? "border-border bg-accent text-accent-foreground"
                          : "hover:border-border hover:bg-muted border-transparent",
                      )}
                    >
                      {tab.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </nav>
    </aside>
  );
}
