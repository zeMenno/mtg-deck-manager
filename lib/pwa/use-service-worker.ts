"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  applyServiceWorkerUpdate,
  registerServiceWorker,
} from "@/lib/pwa/register-sw";

type UseServiceWorkerResult = {
  /** A new version is installed and waiting for permission to take over. */
  updateReady: boolean;
  /** Activates the waiting worker and reloads the page. */
  applyUpdate: () => void;
};

/**
 * Registers the service worker once per app load and reports whether an update
 * is waiting. Mount exactly one consumer (components/pwa/update-prompt.tsx).
 */
export function useServiceWorker(): UseServiceWorkerResult {
  const [updateReady, setUpdateReady] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    let cancelled = false;

    void registerServiceWorker({
      onUpdateWaiting: (registration) => {
        if (cancelled) {
          return;
        }

        registrationRef.current = registration;
        setUpdateReady(true);
      },
    })
      .then((registration) => {
        if (!cancelled && registration) {
          registrationRef.current = registration;
        }
      })
      .catch(() => {
        // A failed registration must never break the app: the app is fully
        // usable without a service worker, it just loses offline support.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const applyUpdate = useCallback(() => {
    const registration = registrationRef.current;

    if (!registration) {
      return;
    }

    setUpdateReady(false);
    applyServiceWorkerUpdate(registration);
  }, []);

  return { updateReady, applyUpdate };
}
