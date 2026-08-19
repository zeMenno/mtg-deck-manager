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
          toast: "border border-border shadow-md rounded-md font-sans",
          title: "text-sm font-semibold",
          description: "text-xs",
          actionButton:
            "bg-primary text-primary-foreground border border-border rounded-sm font-semibold",
        },
      }}
    />
  );
}
