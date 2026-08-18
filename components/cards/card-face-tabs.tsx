"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CardFace } from "@/types/card";

type CardFaceTabsProps = {
  faces: CardFace[];
  activeIndex: number;
  onChange: (index: number) => void;
  className?: string;
};

export function CardFaceTabs({
  faces,
  activeIndex,
  onChange,
  className,
}: CardFaceTabsProps) {
  if (faces.length < 2) return null;

  return (
    <div
      role="tablist"
      aria-label="Card faces"
      className={cn("flex flex-wrap gap-2", className)}
    >
      {faces.map((face, index) => {
        const active = index === activeIndex;
        return (
          <Button
            key={`${face.name}-${index}`}
            type="button"
            role="tab"
            aria-selected={active}
            variant={active ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(index)}
          >
            {face.name}
          </Button>
        );
      })}
    </div>
  );
}
