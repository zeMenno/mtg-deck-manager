import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
        {Icon ? (
          <span className="border-border bg-muted flex size-14 items-center justify-center border">
            <Icon aria-hidden="true" className="size-7" />
          </span>
        ) : null}
        <h2 className="text-xl font-black uppercase">{title}</h2>
        <p className="text-muted-foreground max-w-sm text-sm">{description}</p>
        {action}
      </CardContent>
    </Card>
  );
}
