"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="top-center"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "border-4 border-border shadow-brutal rounded-none font-sans",
          title: "font-bold uppercase text-sm",
          description: "text-xs",
          actionButton:
            "bg-primary text-primary-foreground border-2 border-border uppercase font-bold",
        },
      }}
    />
  );
}
