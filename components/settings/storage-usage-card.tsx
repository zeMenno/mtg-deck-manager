"use client";

import { useEffect, useState } from "react";

import { useDatabase } from "@/components/providers/database-provider";
import { exportFullBackup } from "@/lib/import-export/export-full-backup";
import { estimateStorageUsage } from "@/lib/import-export/storage-estimate";
import type { StorageUsageEstimate } from "@/lib/import-export/storage-estimate";

export type StorageUsageCardProps = {
  refreshKey?: number;
};

export function StorageUsageCard({ refreshKey = 0 }: StorageUsageCardProps) {
  const { ready } = useDatabase();
  const [estimate, setEstimate] = useState<StorageUsageEstimate | null>(null);

  useEffect(() => {
    if (!ready) return;
    void estimateStorageUsage(async () => {
      const backup = await exportFullBackup();
      return JSON.stringify(backup);
    }).then(setEstimate);
  }, [ready, refreshKey]);

  return (
    <div
      className="border-border bg-card shadow-brutal-sm border-2 p-3"
      data-testid="storage-usage-card"
    >
      <p className="font-mono text-xs uppercase">Storage</p>
      <p className="text-sm font-bold">
        {estimate?.label ?? "Measuring local storage…"}
      </p>
    </div>
  );
}
