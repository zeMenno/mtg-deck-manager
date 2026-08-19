"use client";

import type { ReactNode } from "react";

import { BottomNav } from "@/components/app-shell/bottom-nav";
import { SidebarNav } from "@/components/app-shell/sidebar-nav";
import { AppProviders } from "@/components/providers/app-providers";
import { DatabaseProvider } from "@/components/providers/database-provider";
import { OfflineIndicator } from "@/components/pwa/offline-indicator";
import { UpdatePrompt } from "@/components/pwa/update-prompt";
import { AppToaster } from "@/components/shared/app-toaster";
import { SafeAreaWrapper } from "@/components/shared/safe-area-wrapper";
import { UndoProvider } from "@/components/shared/undo-provider";
import { useSymbologyBootstrap } from "@/lib/hooks/use-symbology";

type AppLayoutProps = {
  children: ReactNode;
};

function SymbologyBoot() {
  useSymbologyBootstrap();
  return null;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <AppProviders>
      <UndoProvider>
        <div className="flex min-h-dvh flex-col md:pl-60">
          <SidebarNav />

          <header className="pt-safe border-border bg-background/95 sticky top-0 z-40 border-b shadow-sm backdrop-blur">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-6">
              <span className="font-heading text-lg font-bold tracking-tight md:hidden">
                MTG Deck Builder
              </span>
              <span className="font-heading hidden text-lg font-bold tracking-tight md:inline">
                Deck Builder
              </span>
              <span className="text-muted-foreground text-xs font-medium">
                Local-first
              </span>
            </div>
            <OfflineIndicator />
          </header>

          <main className="mb-safe-nav mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:mb-0 md:px-6">
            <SafeAreaWrapper x>
              <DatabaseProvider>
                <SymbologyBoot />
                {children}
              </DatabaseProvider>
            </SafeAreaWrapper>
          </main>

          <UpdatePrompt />
          <AppToaster />
          <BottomNav />
        </div>
      </UndoProvider>
    </AppProviders>
  );
}
