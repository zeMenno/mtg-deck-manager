"use client";

import Link from "next/link";
import { ChevronRight, Database, Info, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";

import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { RecommendationSettings } from "@/components/settings/recommendation-settings";
import { useDatabase } from "@/components/providers/database-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SettingsRepository } from "@/lib/db/repositories";
import type { Currency } from "@/types";

const plannedSections = [
  {
    icon: Info,
    label: "About & attribution",
    route: "/settings/about",
    phase: "Phase 16",
  },
];

export default function SettingsPage() {
  const { ready } = useDatabase();
  const [currency, setCurrency] = useState<Currency>("USD");
  const [saving, setSaving] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    void new SettingsRepository().get("currency").then(setCurrency);
    void new SettingsRepository().get("lastBackupAt").then(setLastBackupAt);
  }, [ready]);

  async function handleCurrencyChange(next: Currency) {
    if (next === currency) return;
    setSaving(true);
    try {
      await new SettingsRepository().set("currency", next);
      setCurrency(next);
      toast.success(`Currency set to ${next}. Refresh deck prices to update.`);
    } catch {
      toast.error("Could not save currency");
    } finally {
      setSaving(false);
    }
  }

  const backupLabel = lastBackupAt
    ? `Last backup: ${new Date(lastBackupAt).toLocaleDateString()}`
    : "Never backed up";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-black uppercase">Settings</h1>

      <Link
        href="/settings/install"
        data-testid="settings-install-link"
        className="border-border bg-card shadow-brutal-sm hover:bg-muted flex min-h-11 items-center gap-3 border-2 px-4 py-3 transition-colors"
      >
        <Smartphone aria-hidden="true" className="size-5 shrink-0" />
        <span className="flex flex-col">
          <span className="text-sm font-black uppercase">
            Install on iPhone
          </span>
          <span className="text-muted-foreground text-xs">
            Add to Home Screen, and why to do it before building decks
          </span>
        </span>
        <ChevronRight aria-hidden="true" className="ml-auto size-5 shrink-0" />
      </Link>

      <Link
        href="/settings/data"
        data-testid="settings-data-link"
        className="border-border bg-card shadow-brutal-sm hover:bg-muted flex min-h-11 items-center gap-3 border-2 px-4 py-3 transition-colors"
      >
        <Database aria-hidden="true" className="size-5 shrink-0" />
        <span className="flex flex-col">
          <span className="text-sm font-black uppercase">Data & backups</span>
          <span className="text-muted-foreground text-xs">{backupLabel}</span>
        </span>
        <ChevronRight aria-hidden="true" className="ml-auto size-5 shrink-0" />
      </Link>

      <AppearanceSettings />

      <RecommendationSettings />

      <section
        className="border-border bg-card shadow-brutal-sm flex flex-col gap-3 border-2 p-4"
        data-testid="settings-pricing"
      >
        <h2 className="font-mono text-xs uppercase">Pricing currency</h2>
        <p className="text-muted-foreground text-sm">
          Scryfall reference prices. Changing currency does not convert cached
          snapshots — refresh prices on a deck after switching.
        </p>
        <div className="flex gap-2">
          {(["USD", "EUR"] as const).map((code) => (
            <Button
              key={code}
              type="button"
              size="sm"
              variant={currency === code ? "default" : "outline"}
              data-testid={`currency-${code.toLowerCase()}`}
              disabled={!ready || saving}
              onClick={() => void handleCurrencyChange(code)}
            >
              {code}
            </Button>
          ))}
        </div>
        <p className="text-muted-foreground font-mono text-xs">
          Active: {currency} · provider: Scryfall
        </p>
      </section>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="font-mono text-xs uppercase">Planned sections</h2>
          <ul className="flex flex-col gap-2">
            {plannedSections.map((section) => {
              const Icon = section.icon;

              return (
                <li
                  key={section.route}
                  className="border-border bg-muted text-muted-foreground flex min-h-11 items-center gap-3 border-2 px-3 text-sm"
                >
                  <Icon aria-hidden="true" className="size-4" />
                  <span className="font-bold uppercase">{section.label}</span>
                  <code className="font-mono text-xs">{section.route}</code>
                  <span className="ml-auto font-mono text-xs">
                    {section.phase}
                  </span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
