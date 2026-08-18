import { defaultCache } from "@serwist/next/worker";
import type {
  PrecacheEntry,
  RuntimeCaching,
  SerwistGlobalConfig,
} from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Replaced at build time by @serwist/next with the precache manifest.
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * Bump when a cache's contents or strategy change in a way that must invalidate
 * what is already on a device. See README "Service worker & cache versions".
 */
const CACHE_VERSION = "v1";
const APP_SHELL_CACHE = `app-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `static-${CACHE_VERSION}`;

const runtimeCaching: RuntimeCaching[] = [
  {
    // Server routes must never be answered from a cache: they do not exist yet,
    // and when they do (a pricing proxy at the earliest) they will be dynamic.
    matcher: ({ url, sameOrigin }) =>
      sameOrigin && url.pathname.startsWith("/api/"),
    handler: new NetworkOnly(),
  },
  {
    // Icons and fonts are content-addressed or effectively immutable.
    matcher: ({ request, url, sameOrigin }) =>
      sameOrigin &&
      (url.pathname.startsWith("/icons/") || request.destination === "font"),
    handler: new CacheFirst({
      cacheName: STATIC_CACHE,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 64,
          maxAgeSeconds: 60 * 60 * 24 * 365,
        }),
      ],
    }),
  },
  ...defaultCache,
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    cacheName: APP_SHELL_CACHE,
    // Drops precaches from superseded builds and cache versions on activate.
    cleanupOutdatedCaches: true,
  },
  // Deliberately false: a new worker waits so UpdatePrompt can offer a reload
  // instead of swapping bundles under a user mid-edit. Serwist calls
  // self.skipWaiting() when it receives a "SKIP_WAITING" message.
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  disableDevLogs: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
