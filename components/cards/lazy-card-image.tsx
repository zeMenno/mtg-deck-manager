"use client";

import { CardImage } from "@/components/cards/card-image";
import { CardImagePlaceholder } from "@/components/cards/card-image-placeholder";
import { IMAGE_SIZE_CLASS } from "@/lib/display/constants";
import type { CardImageSize } from "@/lib/display/types";
import { useLazyMount } from "@/lib/hooks/use-lazy-mount";
import { cn } from "@/lib/utils";
import type { Card } from "@/types/card";

type LazyCardImageProps = {
  card: Pick<
    Card,
    "id" | "name" | "imageSmall" | "imageNormal" | "imageLarge" | "faces"
  >;
  size?: CardImageSize;
  priority?: boolean;
  imagesEnabled?: boolean;
  className?: string;
  onClick?: () => void;
};

/**
 * In image-mode lists: keep a placeholder until near viewport, then mount CardImage.
 */
export function LazyCardImage({
  card,
  size = "sm",
  priority = false,
  imagesEnabled = true,
  className,
  onClick,
}: LazyCardImageProps) {
  const { ref, mounted } = useLazyMount({
    enabled: !priority,
    rootMargin: "200px",
  });

  const sizeClass = IMAGE_SIZE_CLASS[size];

  if (!mounted) {
    return (
      <div ref={ref} className={cn("relative", sizeClass, className)}>
        <CardImagePlaceholder
          alt={card.name}
          variant="skeleton"
          className={sizeClass}
        />
      </div>
    );
  }

  return (
    <div ref={ref} className={className}>
      <CardImage
        card={card}
        size={size}
        priority={priority}
        imagesEnabled={imagesEnabled}
        onClick={onClick}
      />
    </div>
  );
}
