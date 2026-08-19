"use client";

import { Image as ImageIcon, LayoutGrid, LayoutList } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DisplayDensity } from "@/types";

const OPTIONS: Array<{
  value: DisplayDensity;
  label: string;
  icon: typeof LayoutList;
}> = [
  { value: "compact", label: "Compact", icon: LayoutList },
  { value: "comfortable", label: "Comfortable", icon: LayoutGrid },
  { value: "image", label: "Image", icon: ImageIcon },
];

type DisplayDensityPickerProps = {
  value: DisplayDensity;
  onChange: (density: DisplayDensity) => void;
  /** When true, Image segment is disabled (caller may still auto-enable on select). */
  imagesEnabled?: boolean;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "default";
};

/**
 * Segmented control: Compact | Comfortable | Image.
 */
export function DisplayDensityPicker({
  value,
  onChange,
  imagesEnabled = true,
  disabled = false,
  className,
  size = "sm",
}: DisplayDensityPickerProps) {
  return (
    <div
      role="group"
      aria-label="Display density"
      data-testid="display-density-picker"
      className={cn("flex flex-wrap gap-1", className)}
    >
      {OPTIONS.map(({ value: option, label, icon: Icon }) => {
        const active = value === option;
        const imageBlocked = option === "image" && !imagesEnabled;
        return (
          <Button
            key={option}
            type="button"
            size={size}
            variant={active ? "default" : "outline"}
            disabled={disabled}
            aria-pressed={active}
            aria-label={
              imageBlocked ? `${label} (enables images)` : `${label} density`
            }
            data-testid={`density-${option}`}
            title={imageBlocked ? "Selecting Image turns images on" : label}
            className={cn(!active && "shadow-none")}
            onClick={() => onChange(option)}
          >
            <Icon className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">{label}</span>
          </Button>
        );
      })}
      <span className="sr-only" aria-live="polite">
        Current density: {value}
      </span>
    </div>
  );
}
