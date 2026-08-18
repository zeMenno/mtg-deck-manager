"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

type ChangesNavCardProps = {
  href: string;
  title: string;
  count?: number;
  description?: string;
  testId?: string;
  className?: string;
};

export function ChangesNavCard({
  href,
  title,
  count,
  description,
  testId,
  className,
}: ChangesNavCardProps) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className={cn(
        "border-border bg-card shadow-brutal-sm flex items-center justify-between gap-3 border-2 p-4",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="font-bold uppercase">
          {title}
          {count !== undefined ? (
            <span className="text-muted-foreground ml-2 font-mono">
              ({count})
            </span>
          ) : null}
        </p>
        {description ? (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        ) : null}
      </div>
      <ChevronRight className="size-5 shrink-0" aria-hidden />
    </Link>
  );
}
