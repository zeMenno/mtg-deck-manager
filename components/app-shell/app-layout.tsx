import type { ReactNode } from "react";

import { BottomNav } from "@/components/app-shell/bottom-nav";
import { OfflineIndicator } from "@/components/pwa/offline-indicator";
import { UpdatePrompt } from "@/components/pwa/update-prompt";

type AppLayoutProps = {
  children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="pt-safe border-border bg-secondary sticky top-0 z-40 border-b-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <span className="font-heading text-lg font-black tracking-tight uppercase">
            MTG Deck Builder
          </span>
          <span className="font-mono text-xs uppercase">Local-first</span>
        </div>
        <OfflineIndicator />
      </header>

      <main className="mb-safe-nav mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {children}
      </main>

      <UpdatePrompt />
      <BottomNav />
    </div>
  );
}
