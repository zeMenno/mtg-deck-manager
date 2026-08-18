import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {/* config options here */};

/**
 * Revision for the hand-listed precache entry below. Without one, Serwist
 * treats the URL as immutable and a stale offline page would be served forever.
 * The commit hash keeps it stable across rebuilds of the same source; the UUID
 * fallback covers builds from a tarball with no git history.
 */
const revision =
  spawnSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf-8",
  }).stdout?.trim() || randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // Registration is owned by lib/pwa/register-sw.ts so the update prompt can
  // observe the waiting worker instead of a new version activating silently.
  register: false,
  // A dev service worker would serve stale bundles across HMR reloads.
  disable: process.env.NODE_ENV === "development",
  // Precached so navigation to a route that was never visited online still
  // resolves to a friendly page instead of the browser's offline error.
  additionalPrecacheEntries: [{ url: "/offline", revision }],
});

export default withSerwist(nextConfig);
