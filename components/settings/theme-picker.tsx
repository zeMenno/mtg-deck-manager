"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

const THEMES = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
] as const;

export function ThemePicker() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div
      role="group"
      aria-label="Color theme"
      className="flex flex-wrap gap-2"
      data-testid="theme-picker"
    >
      {THEMES.map(({ value, label, icon: Icon }) => {
        const selected = mounted && resolvedTheme === value;

        return (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={selected ? "default" : "outline"}
            aria-pressed={selected}
            disabled={!mounted}
            data-testid={`theme-${value}`}
            onClick={() => setTheme(value)}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </Button>
        );
      })}
      <span className="sr-only" aria-live="polite">
        {mounted
          ? `${resolvedTheme ?? "Dark"} theme selected`
          : "Loading theme"}
      </span>
    </div>
  );
}
