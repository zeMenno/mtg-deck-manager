"use client";

import { useState } from "react";

import { CardImagePlaceholder } from "@/components/cards/card-image-placeholder";
import { IMAGE_SIZE_CLASS } from "@/lib/display/constants";
import { getCardImageUrl } from "@/lib/display/get-card-image-url";
import type { CardImageSize } from "@/lib/display/types";
import { cn } from "@/lib/utils";
import type { Card } from "@/types/card";

type CardLike = Pick<
  Card,
  "id" | "name" | "imageSmall" | "imageNormal" | "imageLarge" | "faces"
>;

type CardImageProps = {
  /** Preferred: resolve URL from card metadata. */
  card?: CardLike | null;
  /** Legacy / override URL when not passing `card`. */
  src?: string | null;
  alt?: string;
  size?: CardImageSize | "thumb" | "normal" | "large";
  /** Skip lazy load for above-fold (commander hero). */
  priority?: boolean;
  /** When false, show placeholder instead of remote art (list contexts). */
  imagesEnabled?: boolean;
  /** Face index for DFCs (default front). */
  faceIndex?: number;
  className?: string;
  onClick?: () => void;
};

const LEGACY_SIZE: Record<"thumb" | "normal" | "large", CardImageSize> = {
  thumb: "xs",
  normal: "md",
  large: "lg",
};

function resolveSize(size: CardImageProps["size"] = "sm"): CardImageSize {
  if (size === "thumb" || size === "normal" || size === "large") {
    return LEGACY_SIZE[size];
  }
  return size;
}

/**
 * Card art from Scryfall CDN URLs only — never IndexedDB blobs.
 * Lazy by default; respects prefers-reduced-motion for fade-in.
 */
export function CardImage({
  card,
  src,
  alt,
  size = "sm",
  priority = false,
  imagesEnabled = true,
  faceIndex = 0,
  className,
  onClick,
}: CardImageProps) {
  const resolvedSize = resolveSize(size);
  const sizeClass = IMAGE_SIZE_CLASS[resolvedSize];
  const name = alt ?? card?.name ?? "Card";
  const resolvedSrc =
    src ?? (card ? getCardImageUrl(card, resolvedSize, faceIndex) : undefined);
  const showImage = Boolean(imagesEnabled && resolvedSrc);

  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    showImage ? "loading" : "error",
  );

  if (!showImage) {
    return (
      <CardImagePlaceholder
        alt={name}
        variant="missing"
        className={cn(sizeClass, className)}
      />
    );
  }

  const image = (
    <>
      {status === "loading" ? (
        <CardImagePlaceholder
          alt={name}
          variant="skeleton"
          className={cn(sizeClass, "absolute inset-0")}
        />
      ) : null}
      {status === "error" ? (
        <CardImagePlaceholder
          alt={name}
          variant="error"
          className={sizeClass}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- Scryfall CDN; SW caches bytes
        <img
          src={resolvedSrc!}
          alt={name}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          data-testid="card-image"
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          className={cn(
            "border-border bg-muted border-2 object-cover",
            sizeClass,
            status === "loading" && "opacity-0",
            status === "loaded" &&
              "opacity-100 motion-safe:transition-opacity motion-safe:duration-200 motion-reduce:transition-none",
          )}
        />
      )}
    </>
  );

  const wrapperClass = cn("relative block shrink-0", sizeClass, className);

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          wrapperClass,
          "cursor-pointer border-0 bg-transparent p-0",
        )}
        aria-label={`View ${name}`}
      >
        {image}
      </button>
    );
  }

  return <div className={wrapperClass}>{image}</div>;
}
