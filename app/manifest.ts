import type { MetadataRoute } from "next";

/**
 * Verified sRGB equivalents of Solar Dusk dark tokens in app/globals.css:
 * background oklch(0.2161 0.0061 56.0434) → #1c1917 and
 * primary oklch(0.7049 0.1867 47.6044) → #f97316.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "MTG Deck Builder",
    short_name: "Deck Builder",
    description:
      "Local-first Commander deck building and upgrade tracking. Works offline.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1c1917",
    theme_color: "#1c1917",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
