import { Database, Info, Settings as SettingsIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";

const plannedSections = [
  {
    icon: Database,
    label: "Data & backups",
    route: "/settings/data",
    phase: "Phase 10",
  },
  {
    icon: Info,
    label: "About & attribution",
    route: "/settings/about",
    phase: "Phase 16",
  },
];

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-black uppercase">Settings</h1>

      <EmptyState
        icon={SettingsIcon}
        title="Nothing to configure yet"
        description="Display density, currency, and image preferences arrive with the features that use them."
      />

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
