"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { configureScryfallClient } from "@/lib/scryfall";

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Client already retries Scryfall 429/5xx; keep React Query light.
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 24 * 60 * 60 * 1000,
        gcTime: 7 * 24 * 60 * 60 * 1000,
      },
    },
  });
}

function applyScryfallProxyFlag(): void {
  if (typeof window === "undefined") return;
  if (process.env.NEXT_PUBLIC_USE_SCRYFALL_PROXY === "true") {
    // High-level client methods route through /api/cards/* when this is set.
    configureScryfallClient({ baseUrl: "/api/cards" });
  }
}

type AppProvidersProps = {
  children: ReactNode;
};

/**
 * Client providers (TanStack Query + Scryfall config).
 * Wrap inside the root layout alongside DatabaseProvider.
 */
export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(() => {
    applyScryfallProxyFlag();
    return createQueryClient();
  });

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
