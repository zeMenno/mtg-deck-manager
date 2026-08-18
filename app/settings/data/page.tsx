import type { Metadata } from "next";

import { DataManagement } from "@/components/settings/data-management";

export const metadata: Metadata = {
  title: "Data & backups",
  description:
    "Export, import, and clear local deck data. Backups are your disaster recovery.",
};

export default function SettingsDataPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-black uppercase">Data & backups</h1>
        <p className="text-muted-foreground text-sm">
          Export a full JSON backup, restore from a file, or clear this
          device&apos;s local data.
        </p>
      </div>
      <DataManagement />
    </div>
  );
}
