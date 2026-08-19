"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { getDatabase } from "@/lib/db/database";
import {
  initializeDatabase,
  type InitDatabaseResult,
} from "@/lib/db/initialize";

type DatabaseContextValue = {
  ready: boolean;
  error: Error | null;
  init: InitDatabaseResult | null;
};

const DatabaseContext = createContext<DatabaseContextValue>({
  ready: false,
  error: null,
  init: null,
});

export function useDatabase(): DatabaseContextValue {
  return useContext(DatabaseContext);
}

type DatabaseProviderProps = {
  children: ReactNode;
};

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [init, setInit] = useState<InitDatabaseResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        // Touch singleton so SSR-safe getDatabase() is used client-side.
        getDatabase();
        const result = await initializeDatabase();
        if (cancelled) return;
        setInit(result);
        setReady(true);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="border-destructive bg-background text-destructive mx-auto mt-8 max-w-lg rounded-lg border p-6 shadow-md">
        <h1 className="font-heading text-xl font-black uppercase">
          Database error
        </h1>
        <p className="mt-2 font-mono text-sm">{error.message}</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="font-mono text-sm tracking-wide uppercase">
          Opening local database…
        </p>
      </div>
    );
  }

  return (
    <DatabaseContext.Provider value={{ ready, error, init }}>
      {children}
    </DatabaseContext.Provider>
  );
}
