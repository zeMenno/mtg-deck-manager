"use client";

import { useEffect, useState } from "react";

import { useDatabase } from "@/components/providers/database-provider";
import { SettingsRepository } from "@/lib/db/repositories";
import { getDatabase } from "@/lib/db/database";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function formatBackupDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export type LastBackupStatusProps = {
  /** Bump to refetch after export. */
  refreshKey?: number;
};

export function LastBackupStatus({ refreshKey = 0 }: LastBackupStatusProps) {
  const { ready } = useDatabase();
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [deckCount, setDeckCount] = useState<number | null>(null);

  useEffect(() => {
    if (!ready) return;
    void (async () => {
      const settings = new SettingsRepository();
      const at = await settings.get("lastBackupAt");
      setLastBackupAt(at);
      const meta = await getDatabase().appMeta.get("lastBackupDeckCount");
      setDeckCount(
        typeof meta?.value === "number" ? (meta.value as number) : null,
      );
    })();
  }, [ready, refreshKey]);

  const never = !lastBackupAt;
  const stale =
    lastBackupAt !== null &&
    Date.now() - Date.parse(lastBackupAt) > SEVEN_DAYS_MS;

  const warning = never || stale;

  return (
    <div
      className={
        warning
          ? "border-border bg-warning/30 text-foreground border p-3"
          : "border-border bg-muted border p-3"
      }
      data-testid="last-backup-status"
    >
      <p className="font-mono text-xs uppercase">Last backup</p>
      {never ? (
        <p className="text-sm font-bold" data-testid="last-backup-never">
          Never backed up
        </p>
      ) : (
        <p className="text-sm font-bold" data-testid="last-backup-value">
          {formatBackupDate(lastBackupAt)}
          {deckCount !== null ? ` · ${deckCount} decks` : ""}
          {stale ? " · overdue" : ""}
        </p>
      )}
    </div>
  );
}
