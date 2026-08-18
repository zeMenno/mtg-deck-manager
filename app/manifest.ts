import type { MetadataRoute } from "next";

/**
 * Colours mirror the Neo Brutalism tokens in app/globals.css: the theme colour
 * is the hard black border/foreground, the background colour is the app's white
 * canvas so the iOS splash screen does not flash a foreign colour.
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
    background_color: "#ffffff",
    theme_color: "#000000",
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
