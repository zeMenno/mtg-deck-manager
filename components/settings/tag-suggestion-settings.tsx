"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useDatabase } from "@/components/providers/database-provider";
import { Button } from "@/components/ui/button";
import { SettingsRepository } from "@/lib/db/repositories";

export function TagSuggestionSettings() {
  const { ready } = useDatabase();
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ready) return;
    void new SettingsRepository().get("tags.suggestOnAdd").then(setEnabled);
  }, [ready]);

  async function toggle() {
    const next = !enabled;
    setSaving(true);
    try {
      await new SettingsRepository().set("tags.suggestOnAdd", next);
      setEnabled(next);
      toast.success(next ? "Suggestions enabled" : "Suggestions disabled");
    } catch {
      toast.error("Could not save tag suggestion setting");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="border-border bg-card flex flex-col gap-3 rounded-md border p-4 shadow-sm"
      data-testid="tag-suggestion-settings"
    >
      <div>
        <h2 className="font-mono text-xs uppercase">Tag suggestions</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Use conservative, offline rules to tag newly added cards. Suggestions
          remain fully editable and never use AI or overwrite existing tags.
        </p>
      </div>
      <Button
        type="button"
        variant={enabled ? "default" : "outline"}
        disabled={!ready || saving}
        aria-pressed={enabled}
        data-testid="suggest-on-add-toggle"
        onClick={() => void toggle()}
      >
        Suggest on add: {enabled ? "On" : "Off"}
      </Button>
    </section>
  );
}
