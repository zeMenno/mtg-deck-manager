"use client";

import { ImageOff } from "lucide-react";

import { cn } from "@/lib/utils";

type CardImagePlaceholderProps = {
  alt: string;
  className?: string;
  /** Skeleton while loading vs error/missing art. */
  variant?: "skeleton" | "error" | "missing";
  initials?: string;
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

/**
 * Brutalist placeholder for card art (loading / missing / error).
 */
export function CardImagePlaceholder({
  alt,
  className,
  variant = "missing",
  initials,
}: CardImagePlaceholderProps) {
  const label =
    variant === "skeleton"
      ? `${alt} loading`
      : variant === "error"
        ? `${alt} (image unavailable)`
        : `${alt} (no image)`;

  return (
    <div
      className={cn(
        "border-border bg-muted text-muted-foreground flex items-center justify-center border",
        variant === "skeleton" &&
          "motion-safe:animate-pulse motion-reduce:animate-none",
        className,
      )}
      role="img"
      aria-label={label}
      data-testid={
        variant === "skeleton"
          ? "card-image-skeleton"
          : variant === "error"
            ? "card-image-error"
            : "card-image-missing"
      }
    >
      {variant === "skeleton" ? (
        <span className="sr-only">{label}</span>
      ) : variant === "error" || variant === "missing" ? (
        <span className="flex flex-col items-center gap-1 px-1 text-center">
          <ImageOff className="size-4 shrink-0" aria-hidden="true" />
          <span className="font-mono text-[0.625rem] leading-none uppercase">
            {initials ?? initialsFromName(alt)}
          </span>
        </span>
      ) : null}
    </div>
  );
}

export { initialsFromName };
