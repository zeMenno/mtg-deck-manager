"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useDatabase } from "@/components/providers/database-provider";
import { exportAndDownloadFullBackup } from "@/lib/import-export/export-full-backup";

export type BackupExportButtonProps = {
  onExported?: () => void;
};

export function BackupExportButton({ onExported }: BackupExportButtonProps) {
  const { ready } = useDatabase();
  const [pending, setPending] = useState(false);

  async function handleExport() {
    setPending(true);
    try {
      const result = await exportAndDownloadFullBackup();
      if (result === "cancelled") {
        toast.message("Export cancelled");
        return;
      }
      toast.success(
        result === "shared" ? "Backup shared" : "Backup downloaded",
      );
      onExported?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      data-testid="export-all-btn"
      disabled={!ready || pending}
      onClick={() => void handleExport()}
    >
      <Download className="size-4" />
      {pending ? "Exporting…" : "Export All Data"}
    </Button>
  );
}
