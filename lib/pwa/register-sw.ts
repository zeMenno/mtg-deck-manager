/**
 * Service worker registration and update detection.
 *
 * @serwist/next is configured with `register: false` (see next.config.ts) so
 * registration happens here, where the waiting worker can be surfaced to the
 * user as a "Reload to update" prompt instead of activating unannounced.
 */

const SERVICE_WORKER_URL = "/sw.js";

export type RegisterServiceWorkerOptions = {
  /** Called when a new worker is installed and waiting to take over. */
  onUpdateWaiting: (registration: ServiceWorkerRegistration) => void;
};

function isServiceWorkerSupported(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

export async function registerServiceWorker({
  onUpdateWaiting,
}: RegisterServiceWorkerOptions): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    return null;
  }

  const registration = await navigator.serviceWorker.register(
    SERVICE_WORKER_URL,
    { scope: "/" },
  );

  // A worker can already be waiting from a previous visit. `controller` being
  // null means this is a first install, which is not an "update".
  if (registration.waiting && navigator.serviceWorker.controller) {
    onUpdateWaiting(registration);
  }

  registration.addEventListener("updatefound", () => {
    const installing = registration.installing;

    if (!installing || !navigator.serviceWorker.controller) {
      return;
    }

    installing.addEventListener("statechange", () => {
      if (installing.state === "installed") {
        onUpdateWaiting(registration);
      }
    });
  });

  return registration;
}

/**
 * Hands control to the waiting worker and reloads once it has claimed the page.
 * Serwist calls `self.skipWaiting()` on receiving this message because the
 * worker itself is built with `skipWaiting: false`.
 */
export function applyServiceWorkerUpdate(
  registration: ServiceWorkerRegistration,
): void {
  const waiting = registration.waiting;

  if (!waiting) {
    window.location.reload();
    return;
  }

  navigator.serviceWorker.addEventListener(
    "controllerchange",
    () => {
      window.location.reload();
    },
    { once: true },
  );

  waiting.postMessage({ type: "SKIP_WAITING" });
}
