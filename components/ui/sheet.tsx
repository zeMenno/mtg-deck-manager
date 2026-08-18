"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { XIcon } from "lucide-react";

import { SheetDragHandle } from "@/components/shared/sheet-drag-handle";
import { cn } from "@/lib/utils";

function Sheet({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50 motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}

type SheetSnap = "half" | "detail" | "tall" | "full";

const SNAP_HEIGHT: Record<SheetSnap, string> = {
  /** ~50% — filters / short forms */
  half: "h-[50dvh] max-h-[50dvh]",
  /** ~70% — card detail (image + actions) */
  detail: "h-[70dvh] max-h-[70dvh]",
  /** ~90% — search results / long lists */
  tall: "h-[90dvh] max-h-[90dvh]",
  /** Content-sized up to 90% */
  full: "max-h-[90dvh]",
};

function SheetContent({
  className,
  children,
  side = "bottom",
  snap = "full",
  showHandle = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left";
  /** Approximate height snap for bottom sheets (Phase 14). */
  snap?: SheetSnap;
  /** Show Neo Brutalism drag handle on bottom sheets. */
  showHandle?: boolean;
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        data-slot="sheet-content"
        data-snap={side === "bottom" ? snap : undefined}
        className={cn(
          "bg-background border-border shadow-brutal data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 border-4 transition ease-in-out data-[state=closed]:duration-200 data-[state=open]:duration-300 motion-reduce:animate-none motion-reduce:transition-none",
          side === "bottom" &&
            cn(
              "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 rounded-none pb-[env(safe-area-inset-bottom,0px)]",
              SNAP_HEIGHT[snap],
            ),
          side === "top" &&
            "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 max-h-[90dvh] rounded-none",
          side === "left" &&
            "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 max-w-sm rounded-none",
          side === "right" &&
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 max-w-sm rounded-none",
          className,
        )}
        {...props}
      >
        {side === "bottom" && showHandle ? <SheetDragHandle /> : null}
        {children}
        <DialogPrimitive.Close className="border-border bg-background ring-offset-background focus:ring-ring absolute top-3 right-3 inline-flex size-11 items-center justify-center border-2 opacity-90 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4 pr-14", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        "mt-auto flex flex-col gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]",
        className,
      )}
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="sheet-title"
      className={cn("font-heading text-lg font-black uppercase", className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
