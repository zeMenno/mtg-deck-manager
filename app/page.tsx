import Link from "next/link";

import { InstallBanner } from "@/components/pwa/install-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { DeckCardStatus } from "@/types";

const statusTokens: { status: DeckCardStatus | "commander"; label: string }[] =
  [
    { status: "current", label: "Current" },
    { status: "add", label: "Add" },
    { status: "cut", label: "Cut" },
    { status: "consider", label: "Consider" },
    { status: "commander", label: "Commander" },
  ];

const statusClasses: Record<(typeof statusTokens)[number]["status"], string> = {
  current: "bg-status-current text-status-current-foreground",
  add: "bg-status-add text-status-add-foreground",
  cut: "bg-status-cut text-status-cut-foreground",
  consider: "bg-status-consider text-status-consider-foreground",
  commander: "bg-status-commander text-status-commander-foreground",
};

export default function HomePage() {
  return (
    <div className="flex flex-col gap-6">
      <InstallBanner />

      <section className="flex flex-col gap-3">
        <h1 className="text-3xl font-black uppercase">MTG Deck Builder</h1>
        <p className="text-muted-foreground text-sm">
          Track what&apos;s in your deck, what&apos;s going in, and what it
          costs.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/decks">Go to decks</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/settings/install">Install app</Link>
          </Button>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Foundation only</CardTitle>
          <CardDescription>
            This is the Phase 1 skeleton. Local storage, card search, and deck
            editing arrive in later phases.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="font-mono text-xs uppercase">Status tokens</h2>
            <div className="flex flex-wrap gap-2">
              {statusTokens.map((token) => (
                <span
                  key={token.status}
                  className={`border-border border-2 px-2 py-1 text-xs font-bold uppercase ${statusClasses[token.status]}`}
                >
                  {token.label}
                </span>
              ))}
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-2">
            <h2 className="font-mono text-xs uppercase">Theme check</h2>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Primary</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
            <p className="text-muted-foreground font-mono text-xs">
              Zero radius, 4px hard offset shadows, DM Sans + Space Mono.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
