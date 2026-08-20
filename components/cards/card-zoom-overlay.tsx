"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus, RotateCw, X } from "lucide-react";

import { CardImagePlaceholder } from "@/components/cards/card-image-placeholder";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ZOOM_DOUBLE_TAP_SCALE,
  ZOOM_FIT_SCALE,
  ZOOM_MAX_SCALE,
  ZOOM_MIN_SCALE,
} from "@/lib/display/constants";
import { getCardImageUrl } from "@/lib/display/get-card-image-url";
import { cn } from "@/lib/utils";
import type { Card } from "@/types/card";

type CardZoomOverlayProps = {
  card: Card | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imagesEnabled?: boolean;
  onOpenDetails?: () => void;
};

type ImageTier = "large" | "normal" | "text";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function CardZoomOverlay({
  card,
  open,
  onOpenChange,
  imagesEnabled = true,
  onOpenDetails,
}: CardZoomOverlayProps) {
  const [faceIndex, setFaceIndex] = useState(0);
  const [scale, setScale] = useState(ZOOM_FIT_SCALE);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [tier, setTier] = useState<ImageTier>("large");
  const [origin, setOrigin] = useState({ x: "50%", y: "50%" });
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastPinch = useRef<number | null>(null);
  const lastTap = useRef<number>(0);
  const dragStart = useRef<{
    x: number;
    y: number;
    tx: number;
    ty: number;
  } | null>(null);
  const swipeStart = useRef<{ y: number } | null>(null);

  const faces = card?.faces?.length ?? 0;
  const canFlip = faces > 1;

  const resetView = useCallback(() => {
    setScale(ZOOM_FIT_SCALE);
    setTranslate({ x: 0, y: 0 });
    setFaceIndex(0);
    setOrigin({ x: "50%", y: "50%" });
  }, []);

  useEffect(() => {
    if (open) resetView();
  }, [open, card?.id, resetView]);

  useEffect(() => {
    if (!card) return;
    const large = getCardImageUrl(card, "lg", faceIndex);
    const normal = getCardImageUrl(card, "md", faceIndex);
    if (large) setTier("large");
    else if (normal) setTier("normal");
    else setTier("text");
  }, [card, faceIndex]);

  const imageSrc =
    card == null
      ? undefined
      : tier === "large"
        ? getCardImageUrl(card, "lg", faceIndex)
        : tier === "normal"
          ? getCardImageUrl(card, "md", faceIndex)
          : undefined;

  const oracleText =
    card?.faces?.[faceIndex]?.oracleText ?? card?.oracleText ?? "";
  const displayName = card?.faces?.[faceIndex]?.name ?? card?.name ?? "Card";
  const typeLine = card?.faces?.[faceIndex]?.typeLine ?? card?.typeLine ?? "";
  const manaCost = card?.faces?.[faceIndex]?.manaCost ?? card?.manaCost ?? "";
  const offlineNote = tier === "normal" && imagesEnabled;
  const showText = !imagesEnabled || tier === "text" || !imageSrc;

  function zoomBy(delta: number, originX?: number, originY?: number) {
    if (originX != null && originY != null) {
      setOrigin({ x: `${originX}px`, y: `${originY}px` });
    }
    setScale((current) =>
      clamp(current + delta, ZOOM_MIN_SCALE, ZOOM_MAX_SCALE),
    );
  }

  function toggleDoubleTap(clientX: number, clientY: number) {
    const now = Date.now();
    if (now - lastTap.current < 320) {
      setOrigin({ x: `${clientX}px`, y: `${clientY}px` });
      setScale((current) =>
        current > ZOOM_FIT_SCALE + 0.05
          ? ZOOM_FIT_SCALE
          : ZOOM_DOUBLE_TAP_SCALE,
      );
      if (scale <= ZOOM_FIT_SCALE + 0.05) {
        setTranslate({ x: 0, y: 0 });
      }
      lastTap.current = 0;
      return true;
    }
    lastTap.current = now;
    return false;
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (pointers.current.size === 1) {
      dragStart.current = {
        x: event.clientX,
        y: event.clientY,
        tx: translate.x,
        ty: translate.y,
      };
      if (scale <= ZOOM_FIT_SCALE + 0.05) {
        swipeStart.current = { y: event.clientY };
      }
    }
    if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()];
      lastPinch.current = Math.hypot(
        pts[0]!.x - pts[1]!.x,
        pts[0]!.y - pts[1]!.y,
      );
      swipeStart.current = null;
    }
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (pointers.current.size === 2 && lastPinch.current) {
      const pts = [...pointers.current.values()];
      const dist = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y);
      const ratio = dist / lastPinch.current;
      lastPinch.current = dist;
      setScale((current) =>
        clamp(current * ratio, ZOOM_MIN_SCALE, ZOOM_MAX_SCALE),
      );
      return;
    }

    if (pointers.current.size === 1 && dragStart.current && scale > 1.05) {
      const dx = event.clientX - dragStart.current.x;
      const dy = event.clientY - dragStart.current.y;
      setTranslate({
        x: dragStart.current.tx + dx,
        y: dragStart.current.ty + dy,
      });
    }
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const start = swipeStart.current;
    if (
      start &&
      scale <= ZOOM_FIT_SCALE + 0.05 &&
      event.clientY - start.y > 80
    ) {
      onOpenChange(false);
    }
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) lastPinch.current = null;
    if (pointers.current.size === 0) {
      dragStart.current = null;
      swipeStart.current = null;
    }
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomBy(0.25);
    }
    if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      zoomBy(-0.25);
    }
    if (event.key === "ArrowLeft") {
      setTranslate((t) => ({ ...t, x: t.x + 24 }));
    }
    if (event.key === "ArrowRight") {
      setTranslate((t) => ({ ...t, x: t.x - 24 }));
    }
    if (event.key === "ArrowUp") {
      setTranslate((t) => ({ ...t, y: t.y + 24 }));
    }
    if (event.key === "ArrowDown") {
      setTranslate((t) => ({ ...t, y: t.y - 24 }));
    }
  }

  return (
    <Dialog open={open && card != null} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={false}
        aria-modal="true"
        aria-label={card?.name ?? "Card"}
        data-testid="card-zoom-overlay"
        className="bg-background/95"
        onKeyDown={onKeyDown}
      >
        <DialogTitle className="sr-only">{card?.name ?? "Card"}</DialogTitle>
        <DialogDescription className="sr-only">
          Zoomed card art. Pinch, double-tap, or use plus and minus to zoom.
        </DialogDescription>

        <div
          className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 pt-[max(3.5rem,calc(env(safe-area-inset-top,0px)+2.75rem))] pb-[max(5.5rem,calc(env(safe-area-inset-bottom,0px)+4.5rem))]"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={(event) => {
            event.preventDefault();
            setOrigin({ x: `${event.clientX}px`, y: `${event.clientY}px` });
            setScale((current) =>
              current > ZOOM_FIT_SCALE + 0.05
                ? ZOOM_FIT_SCALE
                : ZOOM_DOUBLE_TAP_SCALE,
            );
          }}
          onClick={(event) => {
            if (
              event.target === event.currentTarget &&
              scale <= ZOOM_FIT_SCALE + 0.05
            ) {
              onOpenChange(false);
            }
          }}
        >
          {card && showText ? (
            <div
              data-testid="card-zoom-text-fallback"
              className="border-border bg-card max-h-full w-full max-w-md overflow-auto rounded-md border p-4"
            >
              <p className="font-bold">{displayName}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {manaCost ? `${manaCost} · ` : null}
                {typeLine}
              </p>
              {oracleText ? (
                <p className="mt-3 text-sm whitespace-pre-wrap">{oracleText}</p>
              ) : (
                <p className="text-muted-foreground mt-3 text-sm">
                  Card art is unavailable offline.
                </p>
              )}
            </div>
          ) : card && imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- Scryfall CDN; SW caches bytes
            <img
              src={imageSrc}
              alt={displayName}
              data-testid="card-zoom-image"
              onClick={(event) => {
                event.stopPropagation();
                toggleDoubleTap(event.clientX, event.clientY);
              }}
              className={cn(
                "max-h-full max-w-full object-contain",
                "motion-safe:transition-transform motion-reduce:transition-none",
              )}
              style={{
                transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
                transformOrigin: `${origin.x} ${origin.y}`,
              }}
              onError={() => {
                setTier((current) => {
                  if (current === "large") return "normal";
                  return "text";
                });
              }}
            />
          ) : (
            <CardImagePlaceholder alt={displayName} variant="missing" />
          )}
        </div>

        {offlineNote && !showText ? (
          <p className="text-muted-foreground pointer-events-none absolute bottom-[max(4.5rem,env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 font-mono text-[0.625rem] uppercase">
            Best available offline
          </p>
        ) : null}

        <div className="absolute top-[max(0.5rem,env(safe-area-inset-top,0px))] right-[max(0.5rem,env(safe-area-inset-right,0px))] flex gap-1">
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Close"
            data-testid="card-zoom-close"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="absolute right-0 bottom-[max(0.5rem,env(safe-area-inset-bottom,0px))] left-0 flex flex-wrap items-center justify-center gap-2 px-3 pb-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Zoom out"
            data-testid="card-zoom-out"
            onClick={() => zoomBy(-0.25)}
          >
            <Minus className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Zoom in"
            data-testid="card-zoom-in"
            onClick={() => zoomBy(0.25)}
          >
            <Plus className="size-4" />
          </Button>
          {canFlip ? (
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="Flip card"
              data-testid="card-zoom-flip"
              onClick={() => setFaceIndex((i) => (i + 1) % faces)}
            >
              <RotateCw className="size-4" />
            </Button>
          ) : null}
          {onOpenDetails ? (
            <Button
              type="button"
              variant="default"
              data-testid="card-zoom-details"
              onClick={() => {
                onOpenChange(false);
                onOpenDetails();
              }}
            >
              Card details…
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
