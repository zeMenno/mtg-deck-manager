"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { UndoSnackbar } from "@/components/shared/undo-snackbar";

export type UndoAction = {
  id: string;
  message: string;
  undo: () => void | Promise<void>;
  duration?: number;
};

type UndoContextValue = {
  showUndo: (action: Omit<UndoAction, "id"> & { id?: string }) => string;
  dismiss: () => void;
  current: UndoAction | null;
};

const UndoContext = createContext<UndoContextValue | null>(null);

const DEFAULT_DURATION_MS = 5000;

function createUndoId(): string {
  return `undo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type UndoProviderProps = {
  children: ReactNode;
};

/**
 * Queues one undo snackbar at a time (mobile screen space).
 * New actions replace the visible snackbar after dismissing the prior timer.
 */
export function UndoProvider({ children }: UndoProviderProps) {
  const [queue, setQueue] = useState<UndoAction[]>([]);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingRef = useRef(DEFAULT_DURATION_MS);
  const startedAtRef = useRef(0);

  const current = queue[0] ?? null;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearTimer();
    setQueue((prev) => prev.slice(1));
    remainingRef.current = DEFAULT_DURATION_MS;
  }, [clearTimer]);

  const showUndo = useCallback(
    (action: Omit<UndoAction, "id"> & { id?: string }) => {
      const next: UndoAction = {
        id: action.id ?? createUndoId(),
        message: action.message,
        undo: action.undo,
        duration: action.duration ?? DEFAULT_DURATION_MS,
      };
      clearTimer();
      remainingRef.current = next.duration ?? DEFAULT_DURATION_MS;
      setPaused(false);
      setQueue(() => {
        // One at a time: drop any pending queue items; keep newest only.
        return [next];
      });
      return next.id;
    },
    [clearTimer],
  );

  useEffect(() => {
    if (!current || paused) {
      clearTimer();
      return;
    }

    startedAtRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      setQueue((prev) => prev.slice(1));
      remainingRef.current = DEFAULT_DURATION_MS;
    }, remainingRef.current);

    return clearTimer;
  }, [current, paused, clearTimer]);

  const handlePause = useCallback(() => {
    if (!current) return;
    const elapsed = Date.now() - startedAtRef.current;
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    setPaused(true);
  }, [current]);

  const handleResume = useCallback(() => {
    setPaused(false);
  }, []);

  const handleUndo = useCallback(async () => {
    if (!current) return;
    const action = current;
    dismiss();
    await action.undo();
  }, [current, dismiss]);

  const value = useMemo(
    () => ({ showUndo, dismiss, current }),
    [showUndo, dismiss, current],
  );

  return (
    <UndoContext.Provider value={value}>
      {children}
      <UndoSnackbar
        action={current}
        onUndo={() => {
          void handleUndo();
        }}
        onDismiss={dismiss}
        onPause={handlePause}
        onResume={handleResume}
      />
    </UndoContext.Provider>
  );
}

export function useUndo(): UndoContextValue {
  const ctx = useContext(UndoContext);
  if (!ctx) {
    throw new Error("useUndo must be used within UndoProvider");
  }
  return ctx;
}
