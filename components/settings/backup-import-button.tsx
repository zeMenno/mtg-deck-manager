"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import { ImportPreviewDialog } from "@/components/settings/import-preview-dialog";
import { Button } from "@/components/ui/button";
import { useDatabase } from "@/components/providers/database-provider";
import { getDatabase } from "@/lib/db/database";
import { importFullBackup } from "@/lib/import-export/import-full-backup";
import { readJsonFile } from "@/lib/import-export/read-file";
import type { AppBackup } from "@/lib/import-export/types";
import { validateBackup } from "@/lib/import-export/validate-backup";

export type BackupImportButtonProps = {
  onImported?: () => void;
};

export function BackupImportButton({ onImported }: BackupImportButtonProps) {
  const { ready } = useDatabase();
  const inputRef = useRef<HTMLInputElement>(null);
  const [backup, setBackup] = useState<AppBackup | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [existingDeckCount, setExistingDeckCount] = useState(0);
  const [pending, setPending] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    try {
      const json = await readJsonFile(file);
      const result = validateBackup(json);
      if (!result.ok) {
        toast.error(
          result.errors[0]?.message ??
            "This file isn't a valid MTG Deck Builder backup.",
        );
        return;
      }
      const count = await getDatabase().decks.count();
      setExistingDeckCount(count);
      setBackup(result.backup);
      setPreviewOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read file");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleConfirm() {
    if (!backup) return;
    setPending(true);
    try {
      await importFullBackup(backup);
      toast.success("Backup restored");
      setPreviewOpen(false);
      setBackup(null);
      onImported?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        data-testid="import-backup-input"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <Button
        type="button"
        variant="outline"
        data-testid="import-backup-btn"
        disabled={!ready}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="size-4" />
        Import Backup
      </Button>

      <ImportPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        backup={backup}
        existingDeckCount={existingDeckCount}
        pending={pending}
        onConfirm={handleConfirm}
      />
    </>
  );
}
