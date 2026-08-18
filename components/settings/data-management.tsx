"use client";

import { useState } from "react";

import { BackupExportButton } from "@/components/settings/backup-export-button";
import { BackupImportButton } from "@/components/settings/backup-import-button";
import { ClearDataDialog } from "@/components/settings/clear-data-dialog";
import { IosStorageWarning } from "@/components/settings/ios-storage-warning";
import { LastBackupStatus } from "@/components/settings/last-backup-status";
import { StorageUsageCard } from "@/components/settings/storage-usage-card";
import { Button } from "@/components/ui/button";

/**
 * Settings → Data management surface (Phase 10).
 */
export function DataManagement() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [clearOpen, setClearOpen] = useState(false);

  function bump() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="flex flex-col gap-6" data-testid="data-management">
      <IosStorageWarning />

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-xs uppercase">Backup status</h2>
        <LastBackupStatus refreshKey={refreshKey} />
        <StorageUsageCard refreshKey={refreshKey} />
        <p className="text-muted-foreground text-sm">
          Your decks are stored on this device. Export regularly — backups are
          your disaster recovery.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-xs uppercase">Actions</h2>
        <div className="flex flex-col gap-2">
          <BackupExportButton onExported={bump} />
          <BackupImportButton onImported={bump} />
          <Button
            type="button"
            variant="destructive"
            data-testid="clear-all-btn"
            onClick={() => setClearOpen(true)}
          >
            Clear All Data
          </Button>
        </div>
      </section>

      <ClearDataDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        onCleared={bump}
      />
    </div>
  );
}
